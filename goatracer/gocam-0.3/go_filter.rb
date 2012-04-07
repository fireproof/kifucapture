#!/usr/bin/env ruby

STDIN.each_line do |line|
  if !(line =~ /Coords:/) then next; end
  puts line
end
