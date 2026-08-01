package com.moviebooking.controller;

import com.moviebooking.dto.MovieDto;
import com.moviebooking.service.MovieService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    /** Public — list all active movies */
    @GetMapping
    public ResponseEntity<List<MovieDto>> getAllMovies(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String genre) {
        return ResponseEntity.ok(movieService.getActiveMovies(city, genre));
    }

    /** Public — single movie detail */
    @GetMapping("/{id}")
    public ResponseEntity<MovieDto> getMovie(@PathVariable Long id) {
        return ResponseEntity.ok(movieService.getMovieById(id));
    }

    /** Admin — create movie */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MovieDto> createMovie(@Valid @RequestBody MovieDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(movieService.createMovie(dto));
    }

    /** Admin — update movie */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MovieDto> updateMovie(@PathVariable Long id,
                                                 @Valid @RequestBody MovieDto dto) {
        return ResponseEntity.ok(movieService.updateMovie(id, dto));
    }

    /** Admin — soft delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteMovie(@PathVariable Long id) {
        movieService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }
}
