package com.svi.facematch;

import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.opencsv.exceptions.CsvValidationException;

import java.io.*;
import java.nio.file.*;
import java.util.*;

public final class CSVUtils {

    public static record Pair(String applicantId, String idPath, String selfiePath) {}

    public static List<Pair> readPairs(String path) throws IOException {
        var pairs = new ArrayList<Pair>();
        try (var reader = new CSVReader(Files.newBufferedReader(Paths.get(path)))) {
            String[] header = reader.readNext();
            if (header == null) throw new IOException("CSV is empty");
            int idIdx = indexOf(header, "id_image_path");
            int selfieIdx = indexOf(header, "selfie_image_path");
            int appIdx = indexOf(header, "applicant_id");
            if (appIdx < 0 || idIdx < 0 || selfieIdx < 0)
                throw new IOException("CSV missing required columns: applicant_id, id_image_path, selfie_image_path");
            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length <= Math.max(appIdx, Math.max(idIdx, selfieIdx))) continue;
                pairs.add(new Pair(row[appIdx].trim(), row[idIdx].trim(), row[selfieIdx].trim()));
            }
        } catch (CsvValidationException e) {
            throw new IOException("CSV parse error", e);
        }
        return pairs;
    }

    public static void writeResults(String path, List<MatchResult> results) throws IOException {
        try (var writer = new CSVWriter(Files.newBufferedWriter(Paths.get(path)))) {
            writer.writeNext(MatchResult.csvHeader());
            for (var r : results) writer.writeNext(r.toCsvRow());
        }
    }

    private static int indexOf(String[] arr, String val) {
        for (int i = 0; i < arr.length; i++)
            if (arr[i].trim().equalsIgnoreCase(val)) return i;
        return -1;
    }

    private CSVUtils() {}
}
