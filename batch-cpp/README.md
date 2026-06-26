# dlib C++ Batch Processor

Batch face matching using **dlib** (C++ library).

**Note:** This is a skeleton project. Building it requires:
- C++ compiler (MSVC, GCC, or Clang)
- CMake 3.20+
- [dlib](http://dlib.net/) installed (e.g. via vcpkg: `vcpkg install dlib`)
- OpenCV installed (e.g. via vcpkg: `vcpkg install opencv`)
- dlib model files downloaded:
  - [`shape_predictor_68_face_landmarks.dat`](http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2)
  - [`dlib_face_recognition_resnet_model_v1.dat`](http://dlib.net/files/dlib_face_recognition_resnet_model_v1.dat.bz2)

## Build

```bash
cd batch-cpp
mkdir build && cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=/path/to/vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build . --config Release
```

## Usage

```bash
./build/face-match-batch --input pairs.csv --threshold 0.6

# With parallel workers
./build/face-match-batch --input pairs.csv --workers 4

# Custom model directory
./build/face-match-batch --input pairs.csv --models ./models
```

## Input/Output CSV

Same format as the Python batch processor:

```csv
applicant_id,id_image_path,selfie_image_path
APP001,photo1.jpg,selfie1.jpg
```

## Recommendation

For most users, the **Python batch processor** (`batch/batch.py --provider insightface`)
is easier to set up and use. dlib C++ is only needed if:
- You need maximum performance (C++ is faster than Python)
- You're integrating dlib into an existing C++ application
- You cannot install Python dependencies

The Python InsightFace provider has equivalent accuracy to dlib and is much
easier to install on Windows (no CMake required).
