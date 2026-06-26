# Megamatcher Java Batch Processor

Batch face matching using the **Megamatcher Java SDK** (Neurotechnology).

SVI already owns a Megamatcher license and uses it in the OWA Payara backend.
This batch processor performs the same 1:1 face verification from the command line.

## Prerequisites

- Java 17+ (uses Java 25 features — records, pattern matching)
- Maven 3.8+
- **Megamatcher SDK jars** (commercial — requires license from Neurotechnology)

## Setup

1. **Place the SDK jars** in `lib/`:

   ```
   batch-java/
   ├── lib/
   │   ├── NMatcher.jar       # Core matching library
   │   ├── NImage.jar          # Image loading
   │   ├── NLicensing.jar      # License management
   │   └── ... (other dependencies as needed)
   ```

2. **Install jars to local Maven repo** (update versions as needed):

   ```bash
   mvn install:install-file -Dfile=lib/NMatcher.jar \
     -DgroupId=com.neurotechnology -DartifactId=nmatcher -Dversion=9.4 -Dpackaging=jar

   mvn install:install-file -Dfile=lib/NImage.jar \
     -DgroupId=com.neurotechnology -DartifactId=nimage -Dversion=9.4 -Dpackaging=jar

   mvn install:install-file -Dfile=lib/NLicensing.jar \
     -DgroupId=com.neurotechnology -DartifactId=nlicensing -Dversion=9.4 -Dpackaging=jar
   ```

   Then update `pom.xml` to use `<scope>compile</scope>` instead of `<scope>system</scope>`.

3. **Build**:

   ```bash
   cd batch-java
   mvn clean package -DskipTests
   ```

4. **Run**:

   ```bash
   java -jar target/face-match-batch.jar --input pairs.csv --threshold 0.6

   # With parallel workers
   java -jar target/face-match-batch.jar --input pairs.csv --workers 4 --threshold 0.6

   # Custom output
   java -jar target/face-match-batch.jar --input pairs.csv --output results.csv
   ```

## Input CSV Format

```csv
applicant_id,id_image_path,selfie_image_path
APP001,C:/photos/1_ID_John.jpg,C:/photos/1_Selfie_John.jpg
APP002,C:/photos/2_ID_Jane.jpg,C:/photos/2_Face_Jane.jpg
```

## Output CSV Format

```csv
applicant_id,similarity,distance,decision,error
APP001,87.34,0.1266,auto_approve,
APP002,42.10,0.5790,manual_review,
```

Decisions: `auto_approve` (match), `manual_review` (no match), `error`

## Integration Notes

- The Megamatcher SDK is Java-native — **no Python bridge needed**
- The engine wrapper (`MegamatcherEngine.java`) has a reference implementation
  commented out — uncomment and adjust once the SDK is available
- For Spring Boot integration, call the `MegamatcherEngine` directly instead of
  going through the batch CLI
