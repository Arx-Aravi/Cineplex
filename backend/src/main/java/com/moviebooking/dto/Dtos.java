package com.moviebooking.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;

// ── Auth ──────────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    @NotBlank String name;
    @Email @NotBlank String email;
    @NotBlank @Size(min = 6) String password;
    String phone;
}

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {
    @Email @NotBlank String email;
    @NotBlank String password;
}

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    String token;
    String type = "Bearer";
    Long userId;
    String name;
    String email;
    String role;
}

// ── User ──────────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDto {
    Long id;
    String name;
    String email;
    String phone;
    String role;
    LocalDateTime createdAt;
}

// ── Movie ─────────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MovieDto {
    Long id;
    @NotBlank String title;
    String description;
    String genre;
    String language;
    @NotNull @Min(1) Integer duration;
    BigDecimal rating;
    LocalDate releaseDate;
    String posterUrl;
    Boolean isActive;
    LocalDateTime createdAt;
}

// ── Theater ───────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TheaterDto {
    Long id;
    @NotBlank String name;
    @NotBlank String location;
    @NotBlank String city;
    Integer totalScreens;
    List<ScreenDto> screens;
}

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ScreenDto {
    Long id;
    String screenName;
    Integer totalSeats;
}

// ── Show ──────────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ShowDto {
    Long id;
    Long movieId;
    String movieTitle;
    String moviePoster;
    Long screenId;
    String screenName;
    Long theaterId;
    String theaterName;
    String theaterCity;
    LocalDate showDate;
    LocalTime showTime;
    BigDecimal priceRegular;
    BigDecimal pricePremium;
    BigDecimal priceRecliner;
    String status;
    Integer availableSeats;
    Integer totalSeats;
}

// ── Booking ───────────────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BookingRequest {
    @NotNull Long showId;
    @NotEmpty List<Long> seatIds;
    @NotBlank String paymentMethod;
}

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BookingResponse {
    Long id;
    String bookingRef;
    Long showId;
    String movieTitle;
    String theaterName;
    LocalDate showDate;
    LocalTime showTime;
    List<SeatInfo> seats;
    BigDecimal totalAmount;
    String status;
    String paymentStatus;
    String paymentMethod;
    LocalDateTime bookedAt;
    UserDto user;
}

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SeatInfo {
    Long seatId;
    String rowLabel;
    Integer seatNumber;
    String seatType;
    BigDecimal price;
}

// ── Seat Availability ─────────────────────────────────────

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SeatAvailabilityResponse {
    Long showId;
    List<SeatStatus> seats;
}

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SeatStatus {
    Long seatId;
    String rowLabel;
    Integer seatNumber;
    String seatType;
    String status;   // AVAILABLE / BOOKED / BLOCKED
    BigDecimal price;
}

// ── Reports ───────────────────────────────────────────────

public class ReportDto {
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Dashboard {
        Long totalUsers;
        Long totalMovies;
        Long totalBookings;
        BigDecimal totalRevenue;
        Long todaysBookings;
        BigDecimal todaysRevenue;
        List<MovieStats> topMovies;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Revenue {
        LocalDate from;
        LocalDate to;
        BigDecimal total;
        List<DailyRevenue> dailyBreakdown;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyRevenue {
        LocalDate date;
        BigDecimal amount;
        Long bookings;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MovieReport {
        List<MovieStats> movies;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MovieStats {
        Long movieId;
        String title;
        Long totalBookings;
        BigDecimal totalRevenue;
        Double occupancyRate;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Occupancy {
        List<TheaterOccupancy> theaters;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TheaterOccupancy {
        Long theaterId;
        String theaterName;
        Double occupancyRate;
        Long totalShows;
        Long totalSeats;
        Long bookedSeats;
    }
}
