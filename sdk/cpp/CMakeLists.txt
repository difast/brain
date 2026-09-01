cmake_minimum_required(VERSION 3.13)
project(mevratek_cpp CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# The C++ SDK is a facade over the C SDK: one transport, one JSON reader.
if(NOT TARGET mevratek)
  add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../c ${CMAKE_CURRENT_BINARY_DIR}/mevratek-c)
endif()

add_library(mevratek_cpp src/client.cpp)
target_include_directories(mevratek_cpp
  PUBLIC $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
         $<INSTALL_INTERFACE:include>
)
target_link_libraries(mevratek_cpp PUBLIC mevratek)
target_compile_options(mevratek_cpp PRIVATE -Wall -Wextra -Wpedantic)
add_library(mevratek::cpp ALIAS mevratek_cpp)

option(MEVRATEK_CPP_BUILD_TESTS "Build the test suite" ON)
if(MEVRATEK_CPP_BUILD_TESTS)
  enable_testing()
  add_executable(mevratek_cpp_tests tests/test_client.cpp)
  target_link_libraries(mevratek_cpp_tests PRIVATE mevratek_cpp)
  target_compile_options(mevratek_cpp_tests PRIVATE -Wall -Wextra)
  find_package(Threads REQUIRED)
  target_link_libraries(mevratek_cpp_tests PRIVATE Threads::Threads)
  add_test(NAME mevratek_cpp_tests COMMAND mevratek_cpp_tests)
endif()

option(MEVRATEK_CPP_BUILD_EXAMPLES "Build the examples" OFF)
if(MEVRATEK_CPP_BUILD_EXAMPLES)
  add_executable(rover_cpp examples/rover.cpp)
  target_link_libraries(rover_cpp PRIVATE mevratek_cpp)
endif()

include(GNUInstallDirs)
install(TARGETS mevratek_cpp
        ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
        LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR})
install(DIRECTORY include/mevratek DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
