cmake_minimum_required(VERSION 3.20)
project(dlib-face-match VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# dlib (install via vcpkg or build from source)
# vcpkg install dlib
find_package(dlib REQUIRED)

# OpenCV for image I/O
find_package(OpenCV REQUIRED)

add_executable(face-match-batch
    src/main.cpp
    src/face_match.cpp
    src/face_match.h
)

target_link_libraries(face-match-batch PRIVATE
    dlib::dlib
    ${OpenCV_LIBS}
)

# Copy models directory next to binary
add_custom_command(TARGET face-match-batch POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        ${CMAKE_SOURCE_DIR}/models $<TARGET_FILE_DIR:face-match-batch>/models
)
