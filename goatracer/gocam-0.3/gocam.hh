/* 

GoCam - A computer vision tool for extracting moves from go videos
Copyright (C) 2005 Teemu Hirsimäki 
Email: teemu.hirsimaki [at domain] iki.fi

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or (at
your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307,
USA.

*/

#ifndef GOCAM_HH
#define GOCAM_HH

#include "geom.hh"
#include "CImg.h"
#include <vector>

using namespace cimg_library;

/** 
    \mainpage GoCam - A C++ Library for Analysing Go Videos

*/


/** Main classes for the gocam analysis. */
namespace gocam {

  /** A class for analysing images of go boards and storing various
   * information about the analysis.
   *
   * The complete analysis is performed simply by calling the
   * analyse() function after setting the original image with the
   * reset() function.  The analysis steps can also be called
   * individually if it is desired to debug the steps or display
   * intermediate results.  The steps are
   * \li compute_line_images()
   * \li compute_hough_image()
   * \li compute_initial_grid()
   * \li grow_grid()
   *
   * The compute_hough_image() method does nothing, if the x- and
   * y-dimensions of \ref hough_image are already positive.  This
   * allows the use of a precomputed hough image when new analysis
   * features are tested in later phases.
   */
  struct Analyser {
    /** The Default constructor */
    Analyser();

    /** Reset the class for analysing a new image. 
     *	\param img = the image to analyse
     */
    void reset(const CImg<float> &img);

    /** Complete analyse of the image. */
    void analyse();

    /** Compute the line image in \ref line_image. */
    void compute_line_images();

    /** Compute the hough image in \ref hough_image. 
     *
     * If \c hough_image has height and width already, the computation
     * is skipped.  This allows to load a precomputed hough image to
     * save time in debugging later parts of the analysis.
     */
    void compute_hough_image();

    /** Compute an initial small grid from the Hough image.
     *
     * Each line in the original image can be seen as a local maximum
     * in the Hough image.  Since parallel lines in the original
     * image have almost the same angle, the corresponding peaks form
     * an almost vertical series of maximums in the Hough image.
     * This function finds a set of lines that form a small grid in
     * the Hough image.
     */
    void compute_initial_grid();

    /** Fix end points of the lines to match the perpendicular lines. */
    void fix_end_points();
    
    /** Tune a single line to match the line image. 
     *
     * \warning Does not check that the line stays inside the image
     * boundaries.
     *
     * \param line = the line to be tuned
     * \param d1 = the testing segment for the first end point
     * \param d2 = the testing segment for the second end point
     */
    void tune_line(geom::Line &line, geom::Line d1, geom::Line d2);

    /** Tune the grid lines to match the line image. 
     *
     * \note Assumes that the grid lines are sorted correctly.
     */
    void tune_grid();

    /** Grow the grid to the full size. 
     * \param only_once = if true, only one step of growing is performed
     */
    void grow_grid(bool only_once = false);

    /** Grow line series by adding a new line to the best direction.
     * \param series = the line series to process (0 = horizontal, 1 =
     * vertical)
     */
    void add_best_line(int series);

    /** Grow the grid to the full size. */
    

  private:

    /** Compute differences of the rhos of the lines. 
     *
     * \note Assumes that the vector of lines is sorted already.
     *
     * \param vec = a vector of lines
     * \return a vector containing differences between the rhos of the lines.
     */
    std::vector<float> rho_differences(const std::vector<geom::LineRT> &vec);

    /** Compute the score of the addition of a new line. 
     * \param new_line = the new line to add at the edge of the grid
     * \param next_line = the line next to the new line (the old edge line)
     * \param lines = the perpendicular lines to the above two lines
     * \return the score of the addition: the average of the pixel
     * values of the new line segments in the line image.
     */
    float score_new_line(const geom::Line &new_line, 
			 const geom::Line &next_line,
			 const std::vector<geom::Line> &lines);

  public:

    /** @name Parameters for the analysis */
    //@{

    /** Verbosity level. */
    int verbose;

    /** The size of the board (default 19). */
    int board_size;

    /** The width of the peak filter used to compute the line image
     * (default 5). 
     */
    int line_peak_filter_width; 

    /** The width of the peak filter used to enhance the Hough image
     * (default 5).
     */
    int hough_peak_filter_width; 

    /** The standard deviation of the centered Gaussian to get the
     * weighted line image.
     *
     * The value is used for both x and y-dimensions, and is relative
     * to the size of the image.  Value 1.0 means a standard deviation
     * of half of the image.  The default is 0.2.
     */
    float line_image_sigma;

    /** The approximate maximum width of the series used for the
     * initial grid (default 10). */
    int approx_series_width;

    /** The range to remove around the first approximate theta (default 25). */
    int approx_theta_remove_range;
	
    /** The width of the median peak remover used for the initial grid
     * (default 10).
     */
    int median_peak_remove_width;

    /** The number of lines for the initial grid (default 5). */
    int num_initial_lines;

    /** The maximum number of lines for the initial grid before taking
     * the middlemost lines (default 10). 
     */
    int max_initial_lines;
    
    //@}



    /** @name Intermediate results of the analysis */
    //@{

    CImg<float> image; //!< The original image
    CImg<float> line_image; //!< The line image

    /** The line image weighted with a centered Gaussian. */
    CImg<float> weighted_line_image; 

    /** Hough transform of the weighted line image. */
    CImg<float> hough_image; 

    /** Horizontally blurred version of the Hough transform. */
    CImg<float> blurred_hough_image; 

    /** The sum of columns of \c blurred_hough_image. */
    CImg<float> blurred_column_sum;

    /** The approximate positions of the vertical series of maximums. */
    int approx_theta[2];

    /** Vertical maximum cuts of the series. */
    CImg<float> max_rho[2];

    /** The initial grid lines in polar system.  
     * 
     * The two vectors contain the horizontal and vertical lines
     * respectively.
     */
    std::vector<geom::LineRT> initial_lines[2];
    
    /** The grid lines in Euclidian space.
     * 
     * The two vectors contain the horizontal and vertical lines
     * respectively.
     */
    std::vector<geom::Line> lines[2];

    //@}

  };

};

#endif /* GOCAM_HH */
