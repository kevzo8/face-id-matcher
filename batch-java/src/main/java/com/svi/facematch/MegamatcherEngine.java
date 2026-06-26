package com.svi.facematch;

import java.nio.file.*;

/**
 * Wrapper around the Neurotechnology MegaMatcher Java SDK.
 * <p>
 * Replace the placeholder methods below with actual SDK calls once the
 * SDK jars are available in lib/.
 * <p>
 * Real SDK usage looks like:
 * <pre>
 * NMatcher matcher = new NMatcher();
 * NSubject subject1 = matcher.createSubject();
 * subject1.setImage(NImage.fromFile("photo1.jpg"));
 * subject1.createTemplate();
 * NSubject subject2 = matcher.createSubject();
 * subject2.setImage(NImage.fromFile("photo2.jpg"));
 * subject2.createTemplate();
 * float score = matcher.verifySubject(subject1, subject2);
 * // score is typically 0-1000 (higher = better match)
 * boolean match = score >= threshold;
 * </pre>
 */
public class MegamatcherEngine {

    private boolean initialized = false;
    private String version = "not initialized";

    /**
     * Initialize the Megamatcher SDK.
     *
     * @param licensePath path to license file, or null for default
     */
    public void init(String licensePath) throws Exception {
        // REAL SDK:
        // NLicensing licensing = new NLicensing();
        // if (licensePath != null) {
        //     licensing.setLicensePath(licensePath);
        // } else {
        //     // Try default license paths
        //     licensing.setLicensePath(System.getenv("MEGAMATCHER_LICENSE"));
        // }
        // licensing.activate();

        this.version = "Megamatcher SDK 9.4 (simulated — install SDK jars to activate)";
        this.initialized = true;
    }

    public String getVersion() {
        return version;
    }

    /**
     * Compare two face images and return a MatchResult.
     * <p>
     * This is a placeholder. When the SDK is integrated, it will:
     * <ol>
     *   <li>Load images via NImage.fromFile()</li>
     *   <li>Create NSubject objects and enroll templates</li>
     *   <li>Call NMatcher.verifySubject()</li>
     *   <li>Convert score to similarity/distance</li>
     * </ol>
     */
    public MatchResult compare(String idPath, String selfiePath, double threshold) {
        if (!initialized) {
            return new MatchResult("", 0.0, 1.0, false, MatchResult.DECISION_ERROR, "SDK not initialized");
        }
        return new MatchResult("", 0.0, 1.0, false, MatchResult.DECISION_ERROR,
            "Megamatcher SDK not yet integrated — install NMatcher.jar in lib/");
    }

    /**
     * REAL IMPLEMENTATION REFERENCE (when SDK is installed):
     *
     * public MatchResult compare(String idPath, String selfiePath, double threshold) {
     *     try {
     *         NMatcher matcher = new NMatcher();
     *
     *         NSubject idSubject = matcher.createSubject();
     *         idSubject.setImage(NImage.fromFile(idPath));
     *         idSubject.createTemplate();
     *
     *         NSubject selfieSubject = matcher.createSubject();
     *         selfieSubject.setImage(NImage.fromFile(selfiePath));
     *         selfieSubject.createTemplate();
     *
     *         float score = matcher.verifySubject(idSubject, selfieSubject);
     *         float[] scores = matcher.verifySubject(idSubject, new NSubject[]{selfieSubject});
     *         float score = scores[0];
     *
     *         double matchThreshold = 0.0;  // TODO: read from config
     *         boolean match = score >= matchThreshold;
     *
     *         double similarity = Math.max(0, Math.min(100, score));
     *         double distance = 1.0 - (similarity / 100);
     *
     *         return new MatchResult("", similarity, distance, match, "", "");
     *
     *     } catch (Exception e) {
     *         return new MatchResult("", 0.0, 1.0, false, "error", e.getMessage());
     *     }
     * }
     */
}
