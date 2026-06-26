package com.svi.facematch;

import picocli.CommandLine;
import picocli.CommandLine.*;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/**
 * Batch face matching using the Megamatcher Java SDK.
 * <p>
 * Neurotechnology's MegaMatcher SDK provides high-accuracy 1:1 and 1:N face
 * matching. SVI already owns a license and uses it in production via the
 * /biometric endpoint in the Payara backend.
 * <p>
 * Required SDK jars (place in lib/):
 * <ul>
 *   <li>NMatcher.jar — core matching library</li>
 *   <li>NImage.jar — image loading</li>
 *   <li>NLicensing.jar — license management</li>
 * </ul>
 * <p>
 * Usage:
 * <pre>
 * java -jar face-match-batch.jar --input pairs.csv --output results.csv --threshold 0.6 --workers 4
 * </pre>
 */
@Command(
    name = "megamatcher-batch",
    description = "Batch face matching with Megamatcher Java SDK",
    mixinStandardHelpOptions = true,
    version = "1.0.0"
)
public class MegamatcherBatchProcessor implements Callable<Integer> {

    @Option(names = {"-i", "--input"}, required = true, description = "Input CSV (columns: applicant_id,id_image_path,selfie_image_path)")
    private Path input;

    @Option(names = {"-o", "--output"}, description = "Output CSV (default: results_<timestamp>.csv)")
    private Path output;

    @Option(names = {"-t", "--threshold"}, defaultValue = "0.6", description = "Match threshold (default: 0.6)")
    private double threshold;

    @Option(names = {"-w", "--workers"}, defaultValue = "1", description = "Parallel workers (default: 1)")
    private int workers;

    @Option(names = {"-l", "--license"}, description = "Megamatcher license file path")
    private Path licenseFile;

    private long totalPairs;
    private final AtomicLong completed = new AtomicLong(0);

    @Override
    public Integer call() {
        try {
            if (output == null) {
                output = Paths.get("results_" + java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".csv");
            }

            // 1. Read input
            var pairs = CSVUtils.readPairs(input.toString());
            totalPairs = pairs.size();
            if (pairs.isEmpty()) {
                System.err.println("No pairs found in " + input);
                return 1;
            }

            // 2. Initialize Megamatcher SDK
            var engine = new MegamatcherEngine();
            if (licenseFile != null) {
                engine.init(licenseFile.toString());
            } else {
                engine.init(null); // try default license path
            }

            // 3. Process
            System.out.println("\n  Megamatcher Batch Processor");
            System.out.println("  " + "=".repeat(50));
            System.out.println("  Input:      " + input + " (" + pairs.size() + " records)");
            System.out.println("  Output:     " + output);
            System.out.println("  Threshold:  " + threshold);
            System.out.println("  Workers:    " + workers);
            System.out.println("  SDK:        " + engine.getVersion());
            System.out.println("  " + "=".repeat(50) + "\n");

            var results = processAll(engine, pairs);

            // 4. Write results
            CSVUtils.writeResults(output.toString(), results);

            // 5. Summary
            long approved = results.stream().filter(r -> r.decision().equals(MatchResult.DECISION_APPROVE)).count();
            long review = results.stream().filter(r -> r.decision().equals(MatchResult.DECISION_REVIEW)).count();
            long errors = results.stream().filter(r -> r.decision().equals(MatchResult.DECISION_ERROR)).count();

            System.out.println("\n  Results");
            System.out.println("  " + "=".repeat(50));
            System.out.printf("  Total:    %d%n", totalPairs);
            System.out.printf("  Approved: %d (%.1f%%)%n", approved, (double) approved / totalPairs * 100);
            System.out.printf("  Review:   %d (%.1f%%)%n", review, (double) review / totalPairs * 100);
            System.out.printf("  Errors:   %d%n", errors);
            System.out.println("  Saved:    " + output + "\n");

            return 0;
        } catch (Exception e) {
            System.err.println("Fatal error: " + e.getMessage());
            e.printStackTrace();
            return 1;
        }
    }

    private List<MatchResult> processAll(MegamatcherEngine engine, List<CSVUtils.Pair> pairs) throws Exception {
        if (workers <= 1) {
            var results = new ArrayList<MatchResult>(pairs.size());
            for (var pair : pairs) {
                results.add(processOne(engine, pair));
                printProgress();
            }
            return results;
        }

        var results = new ArrayList<MatchResult>(Collections.nCopies(pairs.size(), null));
        try (var pool = Executors.newFixedThreadPool(workers)) {
            var futures = new ArrayList<Future<Void>>(pairs.size());
            for (int i = 0; i < pairs.size(); i++) {
                final int idx = i;
                final var pair = pairs.get(i);
                futures.add(pool.submit(() -> {
                    var result = processOne(engine, pair);
                    synchronized (results) { results.set(idx, result); }
                    printProgress();
                    return null;
                }));
            }
            for (var f : futures) f.get();
        }
        return results;
    }

    private MatchResult processOne(MegamatcherEngine engine, CSVUtils.Pair pair) {
        try {
            if (!Files.exists(Paths.get(pair.idPath())))
                return MatchResult.error(pair.applicantId(), "ID image not found: " + pair.idPath());
            if (!Files.exists(Paths.get(pair.selfiePath())))
                return MatchResult.error(pair.applicantId(), "Selfie image not found: " + pair.selfiePath());

            var result = engine.compare(pair.idPath(), pair.selfiePath(), threshold);

            if (result.error() != null && !result.error().isEmpty())
                return MatchResult.error(pair.applicantId(), result.error());

            return result.match()
                ? MatchResult.approved(pair.applicantId(), result.similarity(), result.distance())
                : MatchResult.rejected(pair.applicantId(), result.similarity(), result.distance());

        } catch (Exception e) {
            return MatchResult.error(pair.applicantId(), e.getMessage());
        }
    }

    private void printProgress() {
        long done = completed.incrementAndGet();
        System.out.printf("\r  [%d/%d] processed", done, totalPairs);
        if (done == totalPairs) System.out.println();
    }

    public static void main(String[] args) {
        System.exit(new CommandLine(new MegamatcherBatchProcessor()).execute(args));
    }
}
