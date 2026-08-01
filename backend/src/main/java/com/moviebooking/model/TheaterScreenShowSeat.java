package com.moviebooking.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

// ── Theater ───────────────────────────────────────────────
@Entity @Table(name = "theaters")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
class Theater {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 300)
    private String location;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(name = "total_screens")
    private Integer totalScreens = 1;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "theater", cascade = CascadeType.ALL)
    private List<Screen> screens;
}

// ── Screen ────────────────────────────────────────────────
@Entity @Table(name = "screens")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
class Screen {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "theater_id", nullable = false)
    private Theater theater;

    @Column(name = "screen_name", nullable = false, length = 50)
    private String screenName;

    @Column(name = "total_seats", nullable = false)
    private Integer totalSeats;

    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL)
    private List<Seat> seats;

    @OneToMany(mappedBy = "screen")
    private List<Show> shows;
}

// ── Seat ──────────────────────────────────────────────────
@Entity @Table(name = "seats",
    uniqueConstraints = @UniqueConstraint(columnNames = {"screen_id","row_label","seat_number"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
class Seat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    @Column(name = "row_label", nullable = false, length = 2)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type")
    private SeatType seatType = SeatType.REGULAR;

    public enum SeatType { REGULAR, PREMIUM, RECLINER }
}

// ── Show ──────────────────────────────────────────────────
@Entity @Table(name = "shows")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
class Show {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    @Column(name = "show_date", nullable = false)
    private java.time.LocalDate showDate;

    @Column(name = "show_time", nullable = false)
    private java.time.LocalTime showTime;

    @Column(name = "price_regular", nullable = false)
    private BigDecimal priceRegular;

    @Column(name = "price_premium", nullable = false)
    private BigDecimal pricePremium;

    @Column(name = "price_recliner", nullable = false)
    private BigDecimal priceRecliner;

    @Enumerated(EnumType.STRING)
    private ShowStatus status = ShowStatus.ACTIVE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "show")
    private List<Booking> bookings;

    public enum ShowStatus { ACTIVE, CANCELLED, COMPLETED }
}
