#ifndef IM_HH
#define IM_HH

#include <assert.h>
#include "CImg.h"
#include "util.hh"

using namespace cimg_library;

/** General image processing tools. */
namespace im {

  /** A struct for computing the sum of pixels in an image. */
  template <typename T>
  struct PixelSum {

    /** Initialize the summer with a reference to an image. */
    PixelSum(const CImg<T> &img) : img(img), sum(0), count(0) { }

    /** Process a pixel by summing. */
    void operator()(int x, int y)
    {
      sum += img(x, y);
      count++;
    }

    const CImg<T> &img; //!< The image from which the pixel values are fetched
    T sum; //!< The sum of the pixels
    int count; //!< The number of pixels summed
  };


  /** 
      Create a rectangular zero-sum peak filter.

      The filter is first filled with the value of \c -sign, and the
      center value of the filter is set so that the sum is zero.

      \param width = the width of the filter (must be odd)
      \param sign = the sign of the peak
      \return the filter image
  */
  template <typename T>
  CImg<T>
  peak_filter(int width, int sign = 1)
  {
    assert(width % 2 == 1);
    CImg<T> filter(width, width);
    filter.fill(-sign);
    filter(filter.width / 2, filter.height / 2) -= filter.sum();

    return filter;
  }

  /** Set all negative values of the image to zero.
      \param img = the image to be processed
  */
  template <typename T>
  void
  zero_negatives(CImg<T> &img)
  {
    for (int i = 0; i < (int)img.size(); i++)
      if (img[i] < 0)
	img[i] = 0;
  }

  /** Weigh an image with a centered gaussian.
      \param img = the image to weight
      \param xc = center-x of the gaussian
      \param yc = center-y of the gaussian
      \param x_sigma2 = the variance in x-dimension
      \param y_sigma2 = the variance in y-dimension
  */
  template <typename T>
  void
  weight_gaussian(CImg<T> &img, float xc, float yc, 
		  float x_sigma2, float y_sigma2)
  {
    cimg_mapXY(img, x, y) {
      float exponent = 0;
      if (x_sigma2 > 0)
	exponent += -0.5 * (xc - x) * (xc - x) / x_sigma2;
      if (y_sigma2 > 0)
	exponent += -0.5 * (yc - y) * (yc - y) / y_sigma2;
      img(x,y) *= exp(exponent);
    }
  }

  /** 
      Compute the Hough transform.

      Each point in the resulting image correspond to a straight line
      in the original image.  The x-axis represents the angle (theta)
      of the normal of the line, and the y-axis represents the
      distance (rho) between the line and the center of the image.
      The width of the result will be \c num_thetas, and the height of
      the result will be (2 * \c max_rho + 1).  The center row of the
      Hough image corresponds to lines crossing the center of the
      original image.
  
      \param src = the image to transform
      \param theta1 = the smallest value of theta
      \param theta2 = the largest value of theta 
      \param num_thetas = the width of the resulting image
      \param max_rho = the maximum distance considered
      \return Hough transform of \c src
  */
  template<typename T>
  CImg<T> hough(const CImg<T> &src, float theta1, float theta2, 
		int num_thetas, int max_rho)
  {
    int num_rhos = max_rho * 2 + 1;
    int rho_center = num_rhos / 2;
  
    CImg<T> result = CImg<T>(num_thetas, num_rhos);
    result.fill(0);

    cimg_mapXY(src, x, y) {

      // Skip non-positive pixels
      if (src(x,y) <= 0)
	continue;

      float rho_x = (float)x - src.width/2;
      float rho_y = (float)y - src.height/2;
      float rho0 = std::sqrt(rho_x * rho_x + rho_y * rho_y);
      float theta0 = std::atan2(rho_y, rho_x) / M_PI * 180;

      if (theta0 < 0) {
	theta0 += 180;
	rho0 = - rho0;
      }

      // Iterate all thetas and compute corresponding rho
      float theta_delta = (theta2 - theta1) / (num_thetas - 1);
      for (int t = 0; t < num_thetas; t++) {
	float theta = theta1 + t * theta_delta;
	float r = rho0 * std::cos((theta0 - theta) / 180 * M_PI) + rho_center;
	if (r < 0 || r >= result.dimy())
	  continue;

	int ir = (int)floor(r);
	float w = r - ir;

	result(t, ir) += src(x, y) * (1 - w);
	if (ir + 1 < (int)result.height)
	  result(t, ir+1) += src(x, y) * w;
      }
    }

    return result;
  }


  /** Median of the values in a one-dimensional row image. 
   *
   * \note It is safe to specify ranges outside the image.  The range
   * will be clipped.
   *
   * \param img = the source image
   * \param x1 = the start of the range
   * \param x2 = the end of the range
   */
  template <typename T>
  T
  median(CImg<T> &img, int x1, int x2)
  {
    if (x1 < 0)
      x1 = 0;
    if (x2 >= (int)img.width)
      x2 = img.width - 1;

    std::vector<T> values(x2 - x1 + 1);
    for (int x = x1; x <= x2; x++)
      values[x - x1] = img(x);
    return util::median(values);
  }


  /** Remove a peak from a one-dimensional image.
   *
   * \param img = the image to process
   * \param x0 = the location of the peak
   * \param win = the width of the median analysis window
   * \param value = the value to set the peak neighbourhood to
   */
  template <typename T>
  void
  median_peak_remove(CImg<T> &img, int x0, int win, T value = 0)
  {
    // Compute the threshold to stop the removing
    T threshold = im::median(img, x0 - win, x0 + win);

    // Remove values in the right neighbourhood
    for (int i = 0; i < win; i++) {
      int x = x0 + i;
      if (x >= (int)img.width)
	break;
      if (img(x) < threshold)
	break;
      img(x) = value;
    }

    // Remove values in the left neighbourhood
    for (int i = 1; i < win; i++) {
      int x = x0 - i;
      if (x < 0)
	break;
      if (img(x) < threshold)
	break;
      img(x) = value;
    }
  }

  /** Find a maximum from a one-dimensional image. 
   * \param img = the image to find maximum from
   * \param x1 = the start of the range (default: 0)
   * \param x2 = the end of the range (default: the last pixel of the image)
   * \return the position of the maximum
   */
  template <typename T>
  int
  find_max1(const CImg<T> &img, int x1 = 0, int x2 = -1)
  {
    if (x2 < 0)
      x2 = img.width - 1;

    int best_x = x1;
    T best = img(best_x);

    while (x1 < x2) {
      x1++;
      if (img(x1) > best) {
	best = img(x1);
	best_x = x1;
      }
    }
  
    return best_x;
  }

  /** Find maximum along a row of a two-dimensional image.
   * \param img = the image to search the maximum from
   * \param y = the row to analyse
   * \param x1 = the start of the range (default: 0)
   * \param x2 = the end of the range (default: the last pixel of the row)
   * \return the location of the maximum
   */
  template <typename T>
  int
  find_max_x(const CImg<T> &img, int y, int x1 = 0, int x2 = -1)
  {
    if (x2 < 0)
      x2 = img.width - 1;

    int best_x = x1;
    T best = img(best_x, y);

    while (x1 < x2) {
      x1++;
      if (img(x1, y) > best) {
	best = img(x1, y);
	best_x = x1;
      }
    }
  
    return best_x;
  }

  /** Paste an image to another image.
   * \param src = the image to be pasted
   * \param tgt = the target images
   * \param x0 = target location 
   * \param y0 = target location 
   * \return reference to the target image
   */
  template <typename T>
  T&
  paste_image(const T &src, T &tgt, int x0, int y0)
  {
    for (int x = 0; x < (int)src.width; x++) {
      for (int y = 0; y < (int)src.height; y++) {
	tgt(x0 + x, y0 + y) = src(x, y);
      }
    }
    return tgt;
  }

  /** Compute the sum of each column of the image.
   * \param img = the source image
   * \return a one-dimensional image containing the sum of each column
   */
  template<typename T>
  CImg<T> sum_y(const CImg<T> &img)
  {
    CImg<T> result(img.width, 1);
    for (int x = 0; x < (int)img.width; x++) {
      T sum = 0;
      for (int y = 0; y < (int)img.height; y++)
	sum += img(x,y);
      result(x) = sum;
    }
    return result;
  }

  /** Set range of values in an one-dimensional image.
   *
   * \note It is safe to specify ranges outside the image.  The range
   * will be clipped appropriately.
   *
   * \param img = the target image
   * \param x1 = the start of the range
   * \param x2 = the end of the range
   * \param value = the value to set
   * \return a reference to the target image
   */
  template <typename T>
  CImg<T>&
  set_range1(CImg<T> &img, int x1 = 0, int x2 = INT_MAX, T value = 0)
  {
    if (x1 < 0)
      x1 = 0;
    if (x2 > (int)img.width - 1)
      x2 = img.width - 1;

    for (int x = x1; x <= x2; x++)
      img(x) = value;

    return img;
  }

  /** Compute the maximum of each row.
   *
   * \warning The validity of the range is not checked.
   * 
   * \param img = the source image
   * \param x1 = the start of the range
   * \param x2 = the end of the range (negative: use width of image)
   * \return a one dimensional row image containing the maximums
   */
  template <typename T>
  CImg<T>
  max_x(const CImg<T> &img, int x1 = 0, int x2 = -1)
  {
    CImg<T> result(img.height);
  
    if (x2 < 0)
      x2 = img.width - 1;

    for (int y = 0; y < (int)img.height; y++) {
      T max = img(x1, y);
      for (int x = x1 + 1; x <= x2; x++) {
	if (img(x, y) > max)
	  max = img(x, y);
      }
      result(y) = max;
    }

    return result;
  }

  /** Compute the sum of the pixels along a line 
   *
   * \bug The float coordinates should be handled more elegantly so
   * that the line is processed along the longer axis and the other
   * coordinate is computed for each middle location.
   *
   * \warning Does not check the image boundaries.
   * \param img = the source image
   * \param line = the line to sum
   * \return The sum of the pixel values along the line.
   */
  template <typename T>
  T
  line_sum(CImg<T> &img, const geom::Line &line)
  {
    // Check single point
    if ((int)(line.a.x + 0.5) == (int)(line.b.x + 0.5) &&
	(int)(line.a.y + 0.5) == (int)(line.b.y + 0.5))
      return img((int)(line.a.x + 0.5), (int)(line.b.y + 0.5));

    // Compute line
    float dx = line.b.x - line.a.x;
    float dy = line.b.y - line.a.y;
    float div = cimg::max(cimg::abs(dx), cimg::abs(dy));
    dx /= div;
    dy /= div;

    // Add value to points along the line
    T result = 0;
    for (int i = 0; i <= div; i++) {
      int x = (int)(line.a.x + i * dx + 0.5);
      int y = (int)(line.a.y + i * dy + 0.5);
      result += img(x, y);
    }

    return result;
  }

};

#endif /* IM_HH */
