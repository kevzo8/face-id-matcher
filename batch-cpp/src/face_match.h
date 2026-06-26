#ifndef FACE_MATCH_H
#define FACE_MATCH_H

#include <string>
#include <tuple>

/// Result of a face comparison
struct MatchResult {
    double similarity;   // 0.0 — 100.0
    double distance;     // 0.0 — 1.0
    bool match;
    std::string error;

    MatchResult() : similarity(0), distance(1), match(false) {}
    MatchResult(double sim, double dist, bool m)
        : similarity(sim), distance(dist), match(m) {}
    MatchResult(std::string err)
        : similarity(0), distance(1), match(false), error(std::move(err)) {}
};

/// Face matching engine backed by dlib
class FaceMatcher {
public:
    /// @param modelDir path to directory containing dlib models
    explicit FaceMatcher(const std::string& modelDir);
    ~FaceMatcher();

    /// Initialize models — call once before compare()
    /// @param detectorModel path to dlib frontal face detector model
    /// @param shapeModel path to dlib shape predictor (landmarks)
    /// @param recModel path to dlib face recognition model (resnet)
    bool loadModels(
        const std::string& detectorModel,
        const std::string& shapeModel,
        const std::string& recModel
    );

    /// Compare two face images
    /// @param idPath path to ID photo
    /// @param selfiePath path to selfie/face photo
    /// @param threshold 0.0–1.0, lower = stricter
    MatchResult compare(
        const std::string& idPath,
        const std::string& selfiePath,
        double threshold
    );

    bool isReady() const { return m_loaded; }

private:
    bool m_loaded = false;
    void* m_detector = nullptr;   // dlib::frontal_face_detector
    void* m_shapeModel = nullptr; // dlib::shape_predictor
    void* m_recModel = nullptr;   // dlib::face_recognition_model_v1
};

#endif // FACE_MATCH_H
