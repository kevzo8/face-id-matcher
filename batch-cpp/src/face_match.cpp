#include "face_match.h"
#include <iostream>
#include <vector>
#include <dlib/dnn.h>
#include <dlib/image_processing.h>
#include <dlib/image_io.h>
#include <dlib/opencv.h>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>

// -----------------------------------------------------------------------
// REAL DLIB INTEGRATION REFERENCE
//
// To use this, you need:
//   1. dlib installed (vcpkg install dlib)
//   2. OpenCV installed (vcpkg install opencv)
//   3. Model files downloaded:
//      - shape_predictor_68_face_landmarks.dat
//      - dlib_face_recognition_resnet_model_v1.dat
//      Download: http://dlib.net/files/
//
// The void* pointers in the header are used to avoid exposing dlib types
// in the header. In a real implementation, replace them with proper types.
// -----------------------------------------------------------------------

FaceMatcher::FaceMatcher(const std::string& /*modelDir*/) {}

FaceMatcher::~FaceMatcher() {
    // Free dlib resources when properly typed
}

bool FaceMatcher::loadModels(
    const std::string& detectorModel,
    const std::string& shapeModel,
    const std::string& recModel
) {
    try {
        // REAL IMPLEMENTATION:
        // m_detector = new dlib::frontal_face_detector(dlib::get_frontal_face_detector());
        // m_shapeModel = new dlib::shape_predictor();
        // dlib::deserialize(shapeModel) >> *static_cast<dlib::shape_predictor*>(m_shapeModel);
        // m_recModel = new dlib::face_recognition_model_v1();
        // dlib::deserialize(recModel) >> *static_cast<dlib::face_recognition_model_v1*>(m_recModel);

        std::cout << "  [dlib] Note: C++ batch processor needs dlib + models installed" << std::endl;
        std::cout << "  [dlib] Files required:" << std::endl;
        std::cout << "    - " << detectorModel << std::endl;
        std::cout << "    - " << shapeModel << std::endl;
        std::cout << "    - " << recModel << std::endl;

        m_loaded = false;
        return false;
    } catch (const std::exception& e) {
        std::cerr << "  [dlib] Failed to load models: " << e.what() << std::endl;
        return false;
    }
}

MatchResult FaceMatcher::compare(
    const std::string& idPath,
    const std::string& selfiePath,
    double /*threshold*/
) {
    if (!m_loaded) {
        return MatchResult("dlib models not loaded. Install dlib + download model files.");
    }

    try {
        // REAL IMPLEMENTATION:
        //
        // 1. Load images
        // dlib::matrix<dlib::rgb_pixel> idImg, selfieImg;
        // dlib::load_image(idImg, idPath);
        // dlib::load_image(selfieImg, selfiePath);
        //
        // 2. Detect faces
        // auto idFaces = (*static_cast<dlib::frontal_face_detector*>(m_detector))(idImg);
        // auto selfieFaces = (*static_cast<dlib::frontal_face_detector*>(m_detector))(selfieImg);
        //
        // if (idFaces.empty()) return MatchResult("No face in ID photo");
        // if (selfieFaces.empty()) return MatchResult("No face in selfie");
        //
        // 3. Extract face chips
        // auto shape1 = (*static_cast<dlib::shape_predictor*>(m_shapeModel))(idImg, idFaces[0]);
        // auto shape2 = (*static_cast<dlib::shape_predictor*>(m_shapeModel))(selfieImg, selfieFaces[0]);
        //
        // dlib::matrix<dlib::rgb_pixel> chip1, chip2;
        // dlib::extract_image_chip(idImg, dlib::get_face_chip_details(shape1, 150, 0.25), chip1);
        // dlib::extract_image_chip(selfieImg, dlib::get_face_chip_details(shape2, 150, 0.25), chip2);
        //
        // 4. Compute descriptors
        // auto desc1 = (*static_cast<dlib::face_recognition_model_v1*>(m_recModel))(chip1);
        // auto desc2 = (*static_cast<dlib::face_recognition_model_v1*>(m_recModel))(chip2);
        //
        // 5. Compare
        // double distance = dlib::length(desc1 - desc2);
        // double similarity = std::max(0.0, std::min(100.0, (1.0 - distance) * 100.0));
        // bool match = distance < (1.0 - threshold);
        //
        // return MatchResult(similarity, distance, match);

        return MatchResult("dlib C++ integration requires installing dlib + OpenCV");
    } catch (const std::exception& e) {
        return MatchResult(std::string("Match failed: ") + e.what());
    }
}
