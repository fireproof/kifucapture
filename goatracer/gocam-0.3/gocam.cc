#ifndef GOCAM_CC
#define GOCAM_CC
#include "geom.hh"
#include "gocam.hh"
#include "im.hh"
#include "util.hh"


namespace gocam {

  Analyser::Analyser() 
    : verbose(1),
      board_size(19),
      line_peak_filter_width(5),
      hough_peak_filter_width(5),
      line_image_sigma(0.2),
      approx_series_width(10),
      approx_theta_remove_range(25),
      median_peak_remove_width(10),
      num_initial_lines(5),
      max_initial_lines(10)
  { 
  }

  void
  Analyser::reset(const CImg<float> &img)
  {
    image = img;

    // Convert to gray-scale
    image.resize(-100, -100, -100, 1);
    image.normalize(0,1);

    // Reset intermediate variables
    line_image = line_image.empty();
    weighted_line_image = weighted_line_image.empty();
    hough_image = hough_image.empty();
    blurred_hough_image = blurred_hough_image.empty();
    for (int s = 0; s < 2; s++) {
      max_rho[s] = max_rho[s].empty();
      initial_lines[s].clear();
      lines[s].clear();
    }
  }

  void
  Analyser::analyse()
  {
    compute_line_images();
    compute_hough_image();
    compute_initial_grid();
    grow_grid();
    if (verbose > 0)
      fprintf(stderr, "Analysis complete.\n");
  }

  void
  Analyser::compute_line_images()
  {
    if (verbose > 0)
      fprintf(stderr, "Computing the line images.\n");

    // Compute the line image using a peak filter 
    CImg<float> filter = im::peak_filter<float>(line_peak_filter_width, -1);
    line_image = image.get_correlate(filter);
    im::zero_negatives(line_image);
    line_image.normalize(0, 1);

    // Weight the line image with Gaussian
    weighted_line_image = line_image;
    im::weight_gaussian(weighted_line_image, 
			weighted_line_image.width / 2.0,
			weighted_line_image.height / 2.0,
			util::sqr(line_image.width * line_image_sigma),
			util::sqr(line_image.height * line_image_sigma));
    weighted_line_image.normalize(0, 1);
  }

  void
  Analyser::compute_hough_image()
  {
    // Check if the hough image exists already.
    if (hough_image.dimx() > 0 && hough_image.dimy() > 0) {
      if (verbose > 0)
	fprintf(stderr, "Using a pre-computed hough image.\n");
      return;
    }

    if (verbose > 0)
      fprintf(stderr, "Computing the hough image.\n");

    // Compute the hough image for degrees 0, 1, ..., 179.
    int max_rho = cimg::max(weighted_line_image.height,
			    weighted_line_image.width) / 2;
    CImg<float> tmp_hough = im::hough(weighted_line_image, 
				      0, 179, 180, max_rho);

    // Extend the image to degrees 0, 1, ..., 359 by copying the image
    // upside down to right.
    hough_image = CImg<float>(tmp_hough.width * 2, tmp_hough.height);
    im::paste_image(tmp_hough, hough_image, 0, 0);
    tmp_hough.flip('y');
    im::paste_image(tmp_hough, hough_image, tmp_hough.width, 0);

    // Amplify peaks with a peak filter, remove negatives, and normalize
    CImg<float> filter = im::peak_filter<float>(hough_peak_filter_width, 1);
    hough_image.correlate(filter);
    im::zero_negatives(hough_image);
    hough_image.normalize(0, 1);
  }

  void 
  Analyser::compute_initial_grid()
  {
    if (verbose > 0)
      fprintf(stderr, "Computing the initial grid.\n");

    // First we find approximate theta-locations for the two almost
    // vertical series of local maximums in the Hough image.  

    // Blur the image horizontally and compute the sum of each column.
    CImg<float> blur_filter(5,1);
    blur_filter.fill(1);
    blurred_hough_image = hough_image.get_correlate(blur_filter);
    blurred_column_sum = im::sum_y(blurred_hough_image);
    blurred_column_sum.normalize(0, 1);

    // Find the maximum, remove it, and find another maximum.  Note
    // that the maximum is computed between degrees [90,270), so that
    // we avoid the edges of the Hough image.
    approx_theta[0] = im::find_max1(blurred_column_sum, 90, 269);
    im::set_range1(blurred_column_sum, 
		   approx_theta[0] - approx_theta_remove_range,
		   approx_theta[0] + approx_theta_remove_range, (float)0);
    im::set_range1(blurred_column_sum, 
		   approx_theta[0] - approx_theta_remove_range + 180, 
		   approx_theta[0] + approx_theta_remove_range + 180, 
		   (float)0);
    im::set_range1(blurred_column_sum, 
		   approx_theta[0] - approx_theta_remove_range - 180, 
		   approx_theta[0] + approx_theta_remove_range - 180,
		   (float)0);
    approx_theta[1] = im::find_max1(blurred_column_sum, 90, 269);

    // Find best lines for both series
    for (int s = 0; s < 2; s++) {

      // Select best maximums until the next maximum would be less
      // than half of the smallest maximum.  Select at least
      // "num_initial_lines" lines, but at most "max_initial_lines" lines.

      max_rho[s] = im::max_x(hough_image, 
			     approx_theta[s] - approx_series_width,
			     approx_theta[s] + approx_series_width);
      std::vector<float> rho_maxes;
      while (1) {

	// Find a maximum
	int rho = im::find_max1(max_rho[s]);
	float max = max_rho[s](rho);

	// Check if we want more lines
	if ((int)initial_lines[s].size() >= num_initial_lines && 
	    max < 0.5 * rho_maxes.back())
	  break;
	if ((int)initial_lines[s].size() >= max_initial_lines)
	  break;

	// Remove the maximum and the line
	im::median_peak_remove(max_rho[s], rho, median_peak_remove_width);
	int theta = im::find_max_x(hough_image, rho, 
				   approx_theta[s] - approx_series_width, 
				   approx_theta[s] + approx_series_width);
	initial_lines[s].push_back(geom::LineRT(rho, theta));
	rho_maxes.push_back(max);
      }
    }

    // Fill possible gaps in the grid
    for (int s = 0; s < 2; s++) {

      // Compute median difference between lines
      std::sort(initial_lines[s].begin(), initial_lines[s].end());
      std::vector<float> diff = rho_differences(initial_lines[s]);
      float abs_median_diff = cimg::abs(util::median(diff));
    
      // Fill gaps that are greater than 1.5 of the median difference,
      // by finding maximums within the gap.
      for (int l = 0; l < (int)initial_lines[s].size()-1; l++) {
	if (cimg::abs(initial_lines[s][l].rho - initial_lines[s][l+1].rho) < 
	    1.5 * abs_median_diff)
	  continue;

//	// Sanity check
//	if ((int)initial_lines[s].size() >= board_size) {
//	  fprintf(stderr, "initial guess failed: too many lines\n");
//	  exit(1);
//	}

	// Compute and remove the maximum
	int new_rho = im::find_max1(max_rho[s], 
				    (int)initial_lines[s][l].rho,
				    (int)initial_lines[s][l+1].rho);
	im::median_peak_remove(max_rho[s], new_rho, median_peak_remove_width);
	float new_theta = (initial_lines[s][l].theta + 
			   initial_lines[s][l+1].theta) / 2;

	// Add the line at the correct position
	initial_lines[s].insert(initial_lines[s].begin() + l + 1,
				geom::LineRT(new_rho, new_theta));
	l--; // Process the same line again
      
	// Debug report
	if (verbose > 1)
	  fprintf(stderr, "Added a line to fill the gap: "
		  "(rho=%d, theta=%.2f)\n", new_rho, new_theta);
      }

      // Print initial lines if requested
      if (verbose > 1) {
	fprintf(stderr, "Initial lines:\n");
	for (int l = 0; l < (int)initial_lines[s].size(); l++) {
	  fprintf(stderr, "\t%.2f, %.2f\n", initial_lines[s][l].rho, 
		  initial_lines[s][l].theta);
	}
      }
    }

    // Take num_initial_lines from the middle.
    for (int s = 0; s < 2; s++) {
      for (int tgt = 0; tgt < num_initial_lines; tgt++) {
	int src = tgt + (initial_lines[s].size() - num_initial_lines) / 2;
	initial_lines[s][tgt] = initial_lines[s][src];
      }
      initial_lines[s].resize(num_initial_lines);
    }

    // Convert the initial lines in the polar system to Euclidian
    // space, and move to the center of the image.
    int rho_max = hough_image.dimy() / 2;
    for (int s = 0; s < 2; s++) {
      for (int l = 0; l < (int)initial_lines[s].size(); l++) {

	// Currently, the rhos of the initial lines are points in the
	// hough image, i.e., between 0 and hough_image.dimy().
	// Normalize them between -rho_max and rho_max.  Convert also
	// thetas from degrees to radians.
	initial_lines[s][l].rho -= rho_max;
	initial_lines[s][l].theta = geom::rad(initial_lines[s][l].theta);

	// Convert to Euclidian space.
	lines[s].push_back(geom::Line(initial_lines[s][l]));
	lines[s].back().add(geom::Point(line_image.dimx() / 2, 
					line_image.dimy() / 2));
      }
    }
  }

  void
  Analyser::fix_end_points()
  {
    for (int s = 0; s < 2; s++)
      for (int l = 0; l < (int)lines[s].size(); l++)
	lines[s][l].cut(lines[1-s].front(), lines[1-s].back());
  }
  
  void
  Analyser::tune_line(geom::Line &line, geom::Line d1, geom::Line d2)
  {
    // Compute the number of points to test for each end point
    int num_points_d1 = util::max((int)lrintf(d1.length() * 2), 2);
    int num_points_d2 = util::max((int)lrintf(d2.length() * 2), 2);

    // Iterate all orientations and select the best.
    float best_value = -1;
    geom::Line best_line;
    for (int i1 = 0; i1 < num_points_d1; i1++) {
      for (int i2 = 0; i2 < num_points_d2; i2++) {

	// Compute the test end points and the sum along the test
	// line.
	geom::Line test_line(geom::mean(d1.a, d1.b,
					i1 / (num_points_d1 - 1.0)),
			     geom::mean(d2.a, d2.b,
					i2 / (num_points_d2 - 1.0)));
	float value = im::line_sum(line_image, test_line);
	if (value > best_value) {
	  best_value = value;
	  best_line = test_line;
	}
      }
    }
    line = best_line;
  }

  void
  Analyser::tune_grid()
  {
    fix_end_points();

    // Tune both line series
    for (int s = 0; s < 2; s++) {
    
      // Tune each line of a series at time
      for (int l = 0; l < (int)lines[s].size(); l++) {
	geom::Line d1;
	geom::Line d2;
	if (l > 0) {
	  d1.a = geom::mean(lines[s][l-1].a, lines[s][l].a, 0.3);
	  d2.a = geom::mean(lines[s][l-1].b, lines[s][l].b, 0.3);
	}
	else {
	  geom::Line imag_line = lines[s][1].get_mirror(lines[s][0]);
	  imag_line.cut(lines[1-s][0], lines[1-s].back());
	  d1.a = geom::mean(imag_line.a, lines[s][0].a, 0.3);
	  d2.a = geom::mean(imag_line.b, lines[s][0].b, 0.3);
	}
	if (l < (int)lines[s].size() - 1) {
	  d1.b = geom::mean(lines[s][l+1].a, lines[s][l].a, 0.3);
	  d2.b = geom::mean(lines[s][l+1].b, lines[s][l].b, 0.3);
	}
	else {
	  geom::Line imag_line = lines[s][l-1].get_mirror(lines[s][l]);
	  imag_line.cut(lines[1-s][0], lines[1-s].back());
	  d1.b = geom::mean(imag_line.a, lines[s][l].a, 0.3);
	  d2.b = geom::mean(imag_line.b, lines[s][l].b, 0.3);
	}
	tune_line(lines[s][l], d1, d2);
      }
    }    

    fix_end_points();
  }

  void
  Analyser::add_best_line(int series)
  {
    // Short handles for the line series.
    std::vector<geom::Line> &l1 = lines[series];
    std::vector<geom::Line> &l2 = lines[1 - series];
    assert(l1.size() >= 2);
    assert(l2.size() >= 2);

    // Do we have a full board already?
    if ((int)lines[series].size() == board_size)
      return;

    // Get line candidates by mirroring the second lines from the
    // edge with respect to the line at the edge.
    int last = l1.size() - 1;
    geom::Line new_line1 = l1[1].get_mirror(l1[0]);
    geom::Line new_line2 = l1[last - 1].get_mirror(l1[last]);

    // Choose the better candidate.
    // Note that these functions also adjust the end points of the new lines.
    float score1 = score_new_line(new_line1, l1.front(), l2);
    float score2 = score_new_line(new_line2, l1.back(), l2);
    if (score1 > score2)
      l1.insert(l1.begin(), new_line1);
    else
      l1.push_back(new_line2);
  }

  void
  Analyser::grow_grid(bool only_once)
  {
    if (verbose > 0)
      fprintf(stderr, "Growing the grid.\n");

    while ((int)lines[0].size() < board_size || 
	   (int)lines[1].size() < board_size) 
    {
      tune_grid();
      if ((int)lines[0].size() < board_size)
 	add_best_line(0);
      if ((int)lines[1].size() < board_size)
	add_best_line(1);
      if (only_once)
	break;
    }
    tune_grid();
  }

  std::vector<float>
  Analyser::rho_differences(const std::vector<geom::LineRT> &vec)
  {
    // Check size
    std::vector<float> result;
    if (vec.size() == 0)
      return result;

    // Compute differences between the rhos of the lines
    result.resize(vec.size() - 1);
    for (int i = 0; i < (int)vec.size() - 1; i++)
      result[i] = vec[i+1].rho - vec[i].rho;
    return result;
  }

  float
  Analyser::score_new_line(const geom::Line &new_line, 
			   const geom::Line &next_line,
			   const std::vector<geom::Line> &lines)
  {
    // Create the intersection points that correspond to the new line
    // segments parallel to "lines".
    std::vector<geom::Line> two_lines(1, new_line);
    two_lines.push_back(next_line);
    geom::Grid grid(two_lines, lines);

    // Use only half of the line segments
    for (int x = 0; x < grid.width; x++) {
      grid(x, 0).add(grid(x, 1));
      grid(x, 0).scale(0.5);
    }
    
    // Compute the average of the pixel values at the new line segments.
    im::PixelSum<float> sum(line_image);
    for (int l = 0; l < (int)lines.size(); l++) {
      geom::Line segment(grid(l, 0), grid(l, 1));
      segment.map(sum);
    }

    return sum.sum / sum.count;
  }

};

#endif /* GOCAM_CC */
