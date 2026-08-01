package com.moviebooking.controller;

import com.moviebooking.dto.ReportDto;
import com.moviebooking.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {

    private final ReportService reportService;

    @GetMapping("/dashboard")
    public ResponseEntity<ReportDto.Dashboard> getDashboard() {
        return ResponseEntity.ok(reportService.getDashboardStats());
    }

    @GetMapping("/revenue")
    public ResponseEntity<ReportDto.Revenue> getRevenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getRevenueBetween(from, to));
    }

    @GetMapping("/movies")
    public ResponseEntity<ReportDto.MovieReport> getMovieReport() {
        return ResponseEntity.ok(reportService.getMoviePerformance());
    }

    @GetMapping("/occupancy")
    public ResponseEntity<ReportDto.Occupancy> getOccupancy(
            @RequestParam(required = false) Long theaterId) {
        return ResponseEntity.ok(reportService.getOccupancyReport(theaterId));
    }
}
