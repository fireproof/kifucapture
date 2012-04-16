#include "gocam.hh"
#include "conf.hh"

/** The configuration options of the program. */
conf::Config config;
gocam::Analyser analyser;


void
draw_grid(CImg<float> &img, float *rgb)
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
     draw_grid(tmp, white);
  }
}


#ifdef __cplusplus
extern "C" {
#endif
    
int
run_gocam(char *imgfilename, int result[8])
{

    for(int i = 0; i< 8; i++) {
        result[i] = 666 + i;
    }
    return 0;
        
  // Load image file and possible pre-computed hough image
   CImg<float> original_image(imgfilename);
   //fprintf(stdout, "%s ", config.arguments[0].c_str());
   original_image.normalize(0, 1);
   analyser.reset(original_image);
  // if (config["use-hough"].specified)
//     analyser.hough_image = 
//       CImg<float>::load_raw(config["use-hough"].value.c_str());

  // Analyse the image
  //analyser.verbose = 1;
  //if (config["intermediate"].specified) 
   // analyse_step_by_step();
  //else
    analyser.analyse();

  // Save the hough image if reguested
  //if (config['s'].specified)
    //analyser.hough_image.save_raw(config['s'].value.c_str());

  // Display result
    float blue[3] = {0, 0, 1};
    draw_grid(original_image, blue);
  //CImgDisplay display(original_image, "The final analysis");
    return(0);
  
}
#ifdef __cplusplus
}
#endif