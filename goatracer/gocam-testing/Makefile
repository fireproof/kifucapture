# Compilers and compile flags

CXX = g++
OPT = -O2
CXXFLAGS = $(OPT) -Wall # -Wno-sign-compare
LDFLAGS = -L/usr/X11R6/lib -lX11 -lpthread

# The CImg library seems to know only about Sun, Linux, Windows, Mac
# and FreeBSD systems.  If you have other X11-capable system, that
# CImg does not recognize, try uncommenting the following line:

# CXXFLAGS += -Dcimg_display_type=1 -Dcimg_OS=1


# Source files

PROGS = gocam_test
PROG_SRCS = gocam_test.cc
HEADERS = CImg.h geom.hh gocam.hh im.hh util.hh conf.hh str.hh
CLASS_SRCS = gocam.cc conf.cc str.cc
CLASS_OBJS = $(CLASS_SRCS:.cc=.o)
SRCS = $(CLASS_SRCS) $(PROG_SRCS)

# Distribution

VERSION = 0.3
PROJECT = gocam
PACKAGE= $(PROJECT)-$(VERSION)
DIST_FILES = README INSTALL NEWS COPYING Makefile Doxyfile html \
	example.jpg \
	$(HEADERS) $(SRCS)

# Rules

all: $(PROGS)

gocam_test: gocam_test.o $(CLASS_OBJS)
	g++ $(CXXFLAGS) -o $@ $< $(CLASS_OBJS) $(LDFLAGS)

dep-stamp:
	touch dep-stamp

.PHONY: depreal
depreal:
	touch dep-stamp
	make dep

dep: dep-stamp
	$(CXX) -MM $(CPPFLAGS) $(CXXFLAGS) $(SRCS) > dep

.PHONY: doc
doc:
	doxygen

.PHONY: clean
clean:
	rm -f *.o $(PROGS)

.PHONY: cleanbak
cleanbak:
	rm -f *~

.PHONY: dist
dist: doc
	if [ -e "$(PACKAGE)" ]; then \
		echo "$(PACKAGE) exists already"; \
		exit 1; \
	fi

	mkdir $(PACKAGE)
	cp -r $(DIST_FILES) $(PACKAGE)
	tar -czvf $(PACKAGE).tar.gz $(PACKAGE)
	rm -rf $(PACKAGE)
	@echo "created $(PACKAGE).tar.gz"

include dep