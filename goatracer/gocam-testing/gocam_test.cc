#include "CImg.h"
#include "gocam.hh"
#include "conf.hh"

const char *program = "gocam_test";

/** The configuration options of the program. */
conf::Config config;
gocam::Analyser analyser;
std::vector<CImgDisplay*> displays;

void 
print_usage(FILE *file)
{
  fprintf(file, "usage: %s [OPTIONS...] IMAGE\n", program);
  fprintf(file, "%s", config.help_string().c_str());
}


void 
parse_command_line(int argc, char *argv[])
{
  config
    ('h', "help", "", "", "display help")
    ('i', "intermediate", "", "", "show also intermediate results")
    ('s', "save-hough=FILE", "arg", "", "save the hough image")
    ('u', "use-hough=FILE", "arg", "", "load a pre-computed hough image")
    ;
  config.parse(argc, argv);
  config.check_required();
}

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

  // We create pointers to CImgDisplay classes instead of using local
  // variables, because the CImg library seems to hang if the local
  // display classes are destroyed in the end of the function.  FIXME:
  // currently we do not even bother to free them, because this is
  // just a test program.

  analyser.compute_line_images();
  new CImgDisplay(analyser.line_image, "The line image");
  new CImgDisplay(analyser.weighted_line_image, "The weighted line image");

  analyser.compute_hough_image();
  new CImgDisplay(analyser.hough_image, "The hough image");

  analyser.compute_initial_grid();
  analyser.tune_grid();
  analyser.fix_end_points();
  CImg<float> tmp = analyser.line_image;
  draw_grid(tmp, white);
  new CImgDisplay(tmp, "The initial grid lines");

  while ((int)analyser.lines[0].size() < analyser.board_size ||
	 (int)analyser.lines[1].size() < analyser.board_size)
  {
    analyser.add_best_line(0);
    analyser.add_best_line(1);
    analyser.tune_grid();
    tmp = analyser.line_image;
    draw_grid(tmp, white);
    new CImgDisplay(tmp, "Growing the grid");
  }
}

int
main(int argc, char *argv[])
{
  cimg::info();

  // Parse command line arguments
  parse_command_line(argc, argv);
  if (config.arguments.empty() || config["help"].specified) {
    print_usage(stdout);
    exit(0);
  }
  
  // Load image file and possible pre-computed hough image
  CImg<float> original_image(config.arguments[0].c_str());
  fprintf(stdout, "%s ", config.arguments[0].c_str());
  original_image.normalize(0, 1);
  analyser.reset(original_image);
  if (config["use-hough"].specified)
    analyser.hough_image = 
      CImg<float>::load_raw(config["use-hough"].value.c_str());

  // Analyse the image
  analyser.verbose = 1;
  if (config["intermediate"].specified) 
    analyse_step_by_step();
  else
    analyser.analyse();

  // Save the hough image if reguested
  if (config['s'].specified)
    analyser.hough_image.save_raw(config['s'].value.c_str());

  // Display result
  float blue[3] = {0, 0, 1};
  draw_grid(original_image, blue);
  CImgDisplay display(original_image, "The final analysis");
  while (!display.closed) {
    display.wait(100);
    if (display.button)
      exit(0);
  }
}
