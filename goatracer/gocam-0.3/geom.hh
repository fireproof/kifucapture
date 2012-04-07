#ifndef GEOM_HH
#define GEOM_HH

#include <math.h>
#include <vector>
#include <assert.h>
#include "util.hh"

/** Classes for handling the geometry of points and lines. */
namespace geom {

  class LineRT; // Forward declaration for Line::Line(const LineRT &line)



  //////////////////////////////////////////////////
  // Point


  /** A class representing a point in a 2-dimensional space. */
  struct Point {
    
    /** Create a point. */
    Point() : x(0), y(0) { }

    /** Create a point (\c x, \c y).
     * \param x = the x-coordinate
     * \param y = the y-coordinate
     */
    Point(float x, float y) : x(x), y(y) { }

    /** Rotate the point 90 degrees. */
    Point& rot90()
    {
      *this = Point(y, -x);
      return *this;
    }

    /** Return the point rotated 90 degrees. 
     * \return The original point rotated 90 degrees.
     */
    Point get_rot90() const 
    {
      return Point(y, -x);
    }

    /** Compute dot product. 
     * \param p = the point to compute the dot product with
     * \return the dot product
    */
    float dot(const Point &p) const { return x * p.x + y * p.y; }

    /** Add another point to the point.
     * \param p = the point to add
     * \param scale = the scale for \c p
     */
    Point& add(const Point &p, float scale = 1) 
    { 
      x += scale * p.x;
      y += scale * p.y;
      return *this;
    }

    /** Return the result of adding another point from the point.
     * \param p = the point to add
     * \param scale = the scale for \c p
     */
    Point get_add(const Point &p, float scale = 1) const
    { 
      return Point(x + scale * p.x, y + scale * p.y);
    }

    /** Substract another point from the point.
     * \param p = the point to substract
     * \param scale = the scale for \c p
     */
    Point& sub(const Point &p, float scale = 1) 
    { 
      x -= scale * p.x;
      y -= scale * p.y;
      return *this;
    }

    /** Return the result of subtracting another point from the point.
     * \param p = the point to substract
     * \param scale = the scale for \c p
     */
    Point get_sub(const Point &p, float scale = 1) const
    { 
      return Point(x - scale * p.x, y - scale * p.y);
    }

    /** Scale the point.
     * \param scale = the scale
     */
    Point& scale(float scale) 
    { 
      x *= scale; 
      y *= scale; 
      return *this; 
    }

    /** Return scaled point.
     * \param scale = the scale
     */
    Point get_scale(float scale) 
    { 
      return Point(x * scale, y * scale);
    }

    /** Compute the mean between two points. 
     * \param point = the point to compute the mean with
     */
    Point& mean(Point point)
    {
      add(point).scale(0.5);
      return *this;
    }

    /** Return the mean between two points. 
     * \param point = the point to compute the mean with
     */
    Point get_mean(Point point)
    {
      return get_add(point).get_scale(0.5);
    }

    /** Compute the angle of the vector in radians. 
     *
     * \note The angle of (0,0) is also defined.  See the man page of
     * <EM>atan2</EM> for details.
     *
     * \return = the angle
     */
    float angle() const { return atan2(y, x); }

    /** Compute the length of the vector.
     * \return the length
     */
    float length() const { return sqrt(x * x + y * y); }

    /** Normalize the length of the vector.
     * \param length = the new length of the vector
     */
    Point& normalize(float length = 1)
    {
      float len = this->length();
      x /= len;
      y /= len;
      return *this;
    }

    /** Coordinate of the point. */
    float x, y;
  };



  //////////////////////////////////////////////////
  // Line


  /** A class representing a line as two end points. */
  struct Line {

    /** Create a line. */
    Line() { }
    
    /** Create a line. 
     * \param a = the first end point
     * \param b = the second end point
     */
    Line(Point a, Point b) : a(a), b(b) { }

    /** Create a line. 
     * \param x1 = the first end point
     * \param y1 = the first end point
     * \param x2 = the second end point
     * \param y2 = the second end point
     */
    Line(float x1, float y1, float x2, float y2) : a(x1, y1), b(x2, y2) { }

    /**	Create a line by converting from the polar representation (rho, theta).
     *
     * \note The end points of the resulting line are guaranteed to
     * be on the line, but consider the actual positions to be
     * arbitrary.
     */
    Line(const LineRT &line); // Defined after the definition of LineRT

    /** Add a point to the end points of the line. 
     * \param p = the point to add to the line
     * \param scale = the scaling of the point before adding
     */
    void add(Point p, float scale = 1)
    {
      a.add(p, scale);
      b.add(p, scale);
    }

    /** Compute the length of the line. */
    float length() const 
    {
      return b.get_sub(a).length();
    }

    /** Compute the normal of the line.
     * Note that the length of the normal is not normalized to one.
     * \return the normal of the line
     */
    Point normal() const
    {
      return b.get_sub(a).rot90();
    }    

    /** Compute the tangent of the line.
     * Note that the length of the tangent is not normalized to one.
     * \return the tangent of the line
     */
    Point tangent() const
    {
      return b.get_sub(a);
    }    

    /** Compute the intersection with \c line.
     * \param line = the line to intersect with
     * \return the intersection point
     */
    Point intersection(const Line &line) const
    {
      Point line_normal = line.normal();
      Point tangent = this->tangent();
      float k = line.a.get_sub(a).dot(line_normal) / tangent.dot(line_normal);
      return a.get_add(tangent, k);
    }

    /** Cut the line between two lines.
     *
     * The first point will be the intersection with the first line,
     * and the second point will be the intersection with the second
     * line.
     *
     *	\param line1 = the first line
     *	\param line2 = the second line
     */
    Line& cut(const Line &line1, const Line &line2)
    {
      a = this->intersection(line1);
      b = this->intersection(line2);
      return *this;
    }

    /** Compute the cut of the line between two lines.
     *
     * The first point will be the intersection with the first line,
     * and the second point will be the intersection with the second
     * line.
     *
     * \param line1 = the first line
     * \param line2 = the second line
     */
    Line get_cut(const Line &line1, const Line &line2) const
    {
      return Line(this->intersection(line1), this->intersection(line2));
    }

    /** Compute the point on the line that is closest to \c point.
     * \param point = the point
     * \return the point closest to \c point
     */
    Point closest(const Point &point) const 
    {
      Line line(point, point.get_add(this->normal()));
      return this->intersection(line);
    }

    Point a; //!< The first end point.
    Point b; //!< The second end point.

    /** Mirror a point with respect to the line. 
     * \param point = point to mirror
     * \param scale = scale for the mirroring
     */
    Point mirror(const Point &point, float scale = 1) const
    {
      Point mirror_point = this->closest(point);
      return point.get_add(mirror_point.sub(point), 1 + scale);
    }

    /** Mirror the line with respect to the given line.
     * \param mirror = the mirror line
     * \param scale = scale for the mirroring
     */
    Line& mirror(const Line &mirror, float scale = 1)
    {
      a = mirror.mirror(a, scale);
      b = mirror.mirror(b, scale);
      return *this;
    }

    /** Return the line mirrored with respect to the given line.
     *	\param mirror = the mirror line
     */
    Line get_mirror(const Line &mirror) const
    {
      return Line(mirror.mirror(a), mirror.mirror(b));
    }


    /** Map the integer points of the line. 
     * 
     * The method calls \c obj(x, y) for each integer point of the
     * line.
     *
     * \bug The float coordinates should be handled more elegantly so
     * that the line is processed along the longer axis and the other
     * coordinate is computed for each middle location.
     *
     * \param obj = the object to call for each line point
     * \return a reference to the object \c obj
     */
    template <typename T>
    T&
    map(T &obj)
    {
      // Check if we have just a point, and process it
      if ((int)(a.x + 0.5) == (int)(b.x + 0.5) &&
	  (int)(a.y + 0.5) == (int)(b.y + 0.5))
      {
	obj((int)(a.x + 0.5), (int)(b.y + 0.5));
	return obj;
      }
    
      // Compute the line
      float dx = b.x - a.x;
      float dy = b.y - a.y;
      float div = util::max(util::abs(dx), util::abs(dy));
      dx /= div;
      dy /= div;

      // Process the points of the line
      for (int i = 0; i <= div; i++) {
	int x = (int)(a.x + i * dx + 0.5);
	int y = (int)(a.y + i * dy + 0.5);
	obj(x, y);
      }
   
      return obj;
    }

  };



  //////////////////////////////////////////////////
  // LineRT


  /** A class representing a line as the angle and the distance from
   * the origin.
   *   
   * In this representation, \c rho is the distance between the line
   * and the origin, and \c theta is the angle of the <EM>normal</EM>
   * of the line.
   *
   * \note \c rho can also be negative, and the range of \c theta is
   * not restricted.
   */
  struct LineRT {

    /** Create a line. */
    LineRT() : rho(0), theta(0) { }

    /** Create a line. 
     * \param rho = the distance to the origin
     * \param theta = the angle of the normal
     */
    LineRT(float rho, float theta) : rho(rho), theta(theta) { }

    /** Create a line by converting from an end-point representation.
     * \param line = the line to convert from
     */
    LineRT(const Line &line) 
    {
      Point p = line.closest(Point(0, 0));
      rho = p.length();
      theta = p.angle();
    }

    /** Compares lines according to the rho values. */
    bool operator<(const LineRT &line) const 
    {
      if (rho < line.rho)
	return true;
      return false;
    }

    float rho;   //!< the distance to the origin
    float theta; //!< the angle of the normal
  };



  /** A structure representing a grid as a matrix of points. */
  struct Grid {

    /** Create a grid of certain size. 
     * \param width = the width of the grid
     * \param height = the height of the grid
     */
    Grid(int width, int height) : width(width), height(height), 
				  points(width * height) { }

    /** Create a grid of the intersections between two series of
     * lines.
     *
     * This constructor takes two sets of lines, and for each line in
     * the first set, it computes the intersections with each line
     * from the second set.  The intersections are stored so that n'th
     * row contains the intersections of the n'th line of the first
     * set.
     *
     * \param lines1 = the first set of lines
     * \param lines2 = the second set of lines
     */
    Grid(const std::vector<Line> &lines1, const std::vector<Line> &lines2)
      : width(lines2.size()), height(lines1.size()), points(width * height)
    {
      for (int l1 = 0; l1 < (int)lines1.size(); l1++)
	for (int l2 = 0; l2 < (int)lines2.size(); l2++)
	  (*this)(l2, l1) = lines1[l1].intersection(lines2[l2]);
    }

    /** Access a point. 
     *
     * \note The function checks the bounds.
     *
     * \param x = the column of the grid
     * \param y = the row of the grid
     */
    Point &operator()(int x, int y)
    {
      assert(x >= 0 && x < width);
      assert(y >= 0 && y < height);
      return points[y * width + x];
    }

    /** Access the point buffer directly.
     *
     * \note The function checks the bounds.
     *
     * \param index = the index of the point in the buffer
     */
    Point &operator[](int index)
    {
      assert(index >= 0 && index < (int)points.size());
      return points[index];
    }
    

    int width; //!< The width of the grid.
    int height; //!< The height of the grid.

    /** The points in the grid: 1st row, 2nd row, and so on. */
    std::vector<Point> points; 
  };

  /** Compute a weighted mean of two points. 
   * \param p1 = the first points
   * \param p2 = the second point
   * \param weight = the weight of the first point
   */
  inline
  Point
  mean(Point p1, Point p2, float weight = 0.5)
  {
    p2.sub(p1);
    return p1.add(p2, 1.0 - weight);
  }

  //////////////////////////////////////////////////
  // Conversion functions

  // Documented above
  inline
  Line::Line(const LineRT &line)
  {
    Point normal(cos(line.theta), sin(line.theta));
    a = normal.get_scale(line.rho);
    b = a.get_add(normal.get_rot90());
  }

  /** Convert degrees to radians.
   * \param angle = the angle in degrees
   * \return the angle in radians
   */
  inline
  float rad(float angle) { return angle / 180 * M_PI; }

  /** Convert radians to degrees.
   * \param angle = the angle in radians
   * \return the angle in degrees
   */
  inline
  float deg(float angle) { return angle * 180 / M_PI; }
}

#endif /* GEOM_HH */
