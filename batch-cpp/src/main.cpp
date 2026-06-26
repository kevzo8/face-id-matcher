#include "face_match.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include <mutex>
#include <atomic>
#include <iomanip>

struct Pair {
    std::string applicantId;
    std::string idPath;
    std::string selfiePath;
};

struct CsvResult {
    std::string applicantId;
    double similarity;
    double distance;
    std::string decision;
    std::string error;

    std::string toCsv() const {
        std::ostringstream out;
        out << applicantId << ","
            << std::fixed << std::setprecision(2) << similarity << ","
            << std::setprecision(4) << distance << ","
            << decision << ","
            << error;
        return out.str();
    }
};

static std::vector<Pair> readPairs(const std::string& path) {
    std::vector<Pair> pairs;
    std::ifstream file(path);
    if (!file) {
        std::cerr << "Cannot open: " << path << std::endl;
        return pairs;
    }

    std::string line;
    // Skip header
    if (!std::getline(file, line)) return pairs;

    while (std::getline(file, line)) {
        if (line.empty()) continue;
        std::istringstream ss(line);
        std::string appId, idPath, selfiePath;
        std::getline(ss, appId, ',');
        std::getline(ss, idPath, ',');
        std::getline(ss, selfiePath, ',');
        if (!appId.empty() && !idPath.empty() && !selfiePath.empty()) {
            pairs.push_back({appId, idPath, selfiePath});
        }
    }
    return pairs;
}

static void writeResults(const std::string& path, const std::vector<CsvResult>& results) {
    std::ofstream file(path);
    file << "applicant_id,similarity,distance,decision,error\n";
    for (const auto& r : results) {
        file << r.toCsv() << "\n";
    }
    std::cout << "  Saved: " << path << std::endl;
}

int main(int argc, char* argv[]) {
    std::string inputPath;
    std::string outputPath;
    std::string modelDir = "models";
    double threshold = 0.6;
    int workers = 1;

    // Minimal arg parsing
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--input" || arg == "-i") { if (++i < argc) inputPath = argv[i]; }
        else if (arg == "--output" || arg == "-o") { if (++i < argc) outputPath = argv[i]; }
        else if (arg == "--threshold" || arg == "-t") { if (++i < argc) threshold = std::stod(argv[i]); }
        else if (arg == "--workers" || arg == "-w") { if (++i < argc) workers = std::stoi(argv[i]); }
        else if (arg == "--models") { if (++i < argc) modelDir = argv[i]; }
        else if (arg == "--help" || arg == "-h") {
            std::cout << "Usage: face-match-batch --input pairs.csv [--output results.csv] [--threshold 0.6] [--workers 1] [--models models/]\n";
            return 0;
        }
    }

    if (inputPath.empty()) {
        std::cerr << "Error: --input is required\n";
        return 1;
    }

    if (outputPath.empty()) {
        auto now = std::chrono::system_clock::now();
        auto t = std::chrono::system_clock::to_time_t(now);
        std::ostringstream ss;
        ss << "results_" << std::put_time(std::localtime(&t), "%Y%m%d_%H%M%S") << ".csv";
        outputPath = ss.str();
    }

    auto pairs = readPairs(inputPath);
    if (pairs.empty()) {
        std::cerr << "No pairs found in " << inputPath << std::endl;
        return 1;
    }

    FaceMatcher matcher(modelDir);
    matcher.loadModels(
        modelDir + "/shape_predictor_68_face_landmarks.dat",
        modelDir + "/shape_predictor_68_face_landmarks.dat",
        modelDir + "/dlib_face_recognition_resnet_model_v1.dat"
    );

    std::cout << "\n  dlib Face Match Batch Processor (C++)" << std::endl;
    std::cout << "  " << std::string(50, '=') << std::endl;
    std::cout << "  Input:     " << inputPath << " (" << pairs.size() << " records)" << std::endl;
    std::cout << "  Output:    " << outputPath << std::endl;
    std::cout << "  Threshold: " << threshold << std::endl;
    std::cout << "  Workers:   " << workers << std::endl;
    std::cout << "  " << std::string(50, '=') << std::endl;

    std::vector<CsvResult> results(pairs.size());
    std::atomic<size_t> completed{0};
    std::mutex printMutex;
    size_t total = pairs.size();

    auto process = [&](size_t idx) {
        const auto& pair = pairs[idx];
        auto r = matcher.compare(pair.idPath, pair.selfiePath, threshold);
        bool match = r.match;
        std::string decision = match ? "auto_approve" : (r.error.empty() ? "manual_review" : "error");
        results[idx] = {pair.applicantId, r.similarity, r.distance, decision, r.error};

        size_t done = ++completed;
        {
            std::lock_guard<std::mutex> lock(printMutex);
            std::cout << "\r  [" << done << "/" << total << "] processed" << std::flush;
            if (done == total) std::cout << std::endl;
        }
    };

    if (workers <= 1) {
        for (size_t i = 0; i < pairs.size(); i++) process(i);
    } else {
        std::vector<std::thread> pool;
        for (int w = 0; w < workers; w++) {
            pool.emplace_back([&, w]() {
                for (size_t i = w; i < pairs.size(); i += workers) process(i);
            });
        }
        for (auto& t : pool) t.join();
    }

    long approved = 0, review = 0, errors = 0;
    for (const auto& r : results) {
        if (r.decision == "auto_approve") approved++;
        else if (r.decision == "manual_review") review++;
        else errors++;
    }

    std::cout << "\n  Results" << std::endl;
    std::cout << "  " << std::string(50, '=') << std::endl;
    std::cout << "  Total:    " << total << std::endl;
    std::cout << "  Approved: " << approved << " (" << (total ? approved * 100.0 / total : 0.0) << "%)" << std::endl;
    std::cout << "  Review:   " << review << " (" << (total ? review * 100.0 / total : 0.0) << "%)" << std::endl;
    std::cout << "  Errors:   " << errors << std::endl;

    writeResults(outputPath, results);
    return 0;
}
