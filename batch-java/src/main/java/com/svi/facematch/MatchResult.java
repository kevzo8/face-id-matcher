package com.svi.facematch;

public record MatchResult(
    String applicantId,
    double similarity,
    double distance,
    boolean match,
    String decision,
    String error
) {
    public static final String DECISION_APPROVE = "auto_approve";
    public static final String DECISION_REVIEW = "manual_review";
    public static final String DECISION_ERROR = "error";

    public static MatchResult approved(String applicantId, double similarity, double distance) {
        return new MatchResult(applicantId, similarity, distance, true, DECISION_APPROVE, "");
    }

    public static MatchResult rejected(String applicantId, double similarity, double distance) {
        return new MatchResult(applicantId, similarity, distance, false, DECISION_REVIEW, "");
    }

    public static MatchResult error(String applicantId, String error) {
        return new MatchResult(applicantId, 0.0, 1.0, false, DECISION_ERROR, error);
    }

    public String[] toCsvRow() {
        return new String[]{
            applicantId,
            String.format("%.2f", similarity),
            String.format("%.4f", distance),
            decision,
            error
        };
    }

    public static String[] csvHeader() {
        return new String[]{"applicant_id", "similarity", "distance", "decision", "error"};
    }
}
