#include "gocam.hh"
#include "conf.hh"
#include "gtimer.h"

/** The configuration options of the program. */
conf::Config config;
gocam::Analyser analyser;


void
draw_grid(CImg<float> &img, float *rgb, int *result)
{
  float red[3] = {1.0, 0.0, 0.0};
  for (int s = 0; s < 2; s++) {
    for (int l = 0; l < (int)analyser.lines[s].size(); l++) {
      geom::Line line = analyser.lines[s][l];
      line.add(geom::Point(0.5, 0.5));
      img.draw_line((int)line.a.x, (int)line.a.y, 
		    (int)line.b.x, (int)line.b.y, rgb);
		    if(s == 0) {
		      if((l == 0) || (l == (int)analyser.lines[s].size() - 1)) {
                  if(l == 0) {
                      result[0] = (int)line.a.x;
                      result[1] = (int)line.a.y;
                      result[2] = (int)line.b.x;
                      result[3] = (int)line.b.y;
                  } else {
                      result[4] = (int)line.a.x;
                      result[5] = (int)line.a.y;
                      result[6] = (int)line.b.x;
                      result[7] = (int)line.b.y;
                  }
		        printf("%d,%d,%d,%d%s",(int)line.a.x, (int)line.a.y, (int)line.b.x, (int)line.b.y, l==0?",":"");
	          img.draw_line((int)line.a.x, (int)line.a.y, 
		    (int)line.b.x, (int)line.b.y, red);      
		      }
		    }
    }
  }
  printf("\n");
}

void
analyse_step_by_step()
{
  float white[1] = {1};
  int result[8];

  analyser.compute_line_images();
  analyser.compute_hough_image();
  analyser.compute_initial_grid();
  analyser.tune_grid();
  analyser.fix_end_points();
   CImg<float> tmp = analyser.line_image;

  while ((int)analyser.lines[0].size() < analyser.board_size ||
	 (int)analyser.lines[1].size() < analyser.board_size)
  {
    analyser.add_best_line(0);
    analyser.add_best_line(1);
    analyser.tune_grid();
     tmp = analyser.line_image;
     draw_grid(tmp, white, result);
  }
}


#ifdef __cplusplus
extern "C" {
#endif
    
int
run_gocam(char *imgfilename, int result[8], const char* tempfilepath)
{
    gtimer_t *overall = create_gtimer();
    gtimer_t *load = create_gtimer();
    gtimer_t *normalize = create_gtimer();
    gtimer_t *reset = create_gtimer();
    gtimer_t *analyze = create_gtimer();
    gtimer_t *drawgrid = create_gtimer();
    
    start_gtimer(overall);
    
    cimg::set_temporary_path(tempfilepath);
    
        
   // Load image file and possible pre-computed hough image
   start_gtimer(load);
   CImg<float> original_image(imgfilename);
   stop_gtimer(load);
    
    start_gtimer(normalize);
   original_image.normalize(0, 1);
    stop_gtimer(normalize);
    
    start_gtimer(reset);
   analyser.reset(original_image);
    stop_gtimer(reset);
    
    start_gtimer(analyze);
   analyser.analyse();
    stop_gtimer(analyze);


  // Display result
    float blue[3] = {0, 0, 1};
    
    start_gtimer(drawgrid);
    draw_grid(original_image, blue, result);
    stop_gtimer(drawgrid);
 
    
    stop_gtimer(overall);
    printf("gocam ET: %f\n", elapsed_seconds(overall));
    printf("load: %f normalize: %f reset: %f\n", elapsed_seconds(load), elapsed_seconds(normalize), elapsed_seconds(reset));
    printf("analyze: %f drawgrid: %f\n", elapsed_seconds(analyze), elapsed_seconds(drawgrid));
    
    return(0);
  
}
#ifdef __cplusplus
}
#endif