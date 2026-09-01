cmake_minimum_required(VERSION 3.13)
project(mevratek C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

find_package(CURL REQUIRED)

add_library(mevratek
  src/mevratek.c
  src/mv_json.c
)
target_include_directories(mevratek
  PUBLIC  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
          $<INSTALL_INTERFACE:include>
  PRIVATE src
)
target_link_libraries(mevratek PUBLIC CURL::libcurl)
target_compile_options(mevratek PRIVATE -Wall -Wextra -Wpedantic)

option(MEVRATEK_BUILD_TESTS "Build the test suite" ON)
if(MEVRATEK_BUILD_TESTS)
  enable_testing()
  add_executable(mevratek_tests tests/test_mevratek.c)
  target_link_libraries(mevratek_tests PRIVATE mevratek)
  target_include_directories(mevratek_tests PRIVATE src)
  target_compile_options(mevratek_tests PRIVATE -Wall -Wextra)
  add_test(NAME mevratek_tests COMMAND mevratek_tests)
endif()

option(MEVRATEK_BUILD_EXAMPLES "Build the examples" OFF)
if(MEVRATEK_BUILD_EXAMPLES)
  add_executable(rover examples/rover.c)
  target_link_libraries(rover PRIVATE mevratek)
endif()

include(GNUInstallDirs)
install(TARGETS mevratek
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(FILES include/mevratek.h DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
