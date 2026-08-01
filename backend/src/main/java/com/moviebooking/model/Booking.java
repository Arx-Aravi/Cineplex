package com.moviebooking.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "bookings")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Booking {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;

    @Column(name = "booking_ref", unique = true, nullable = false, length = 20)
    private String bookingRef;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    private BookingStatus status = BookingStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "booked_at", updatable = false)
    private LocalDateTime bookedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL)
    private List<BookingSeat> bookingSeats;

    public enum BookingStatus  { CONFIRMED, CANCELLED, PENDING }
    public enum PaymentStatus  { PAID, REFUNDED, PENDING }
}

// ── BookingSeat (join table) ──────────────────────────────
@Entity
@Table(name = "booking_seats",
    uniqueConstraints = @UniqueConstraint(columnNames = {"booking_id","seat_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
class BookingSeat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    private BigDecimal price;
}

// ── ShowSeatStatus ────────────────────────────────────────
@Entity
@Table(name = "show_seat_status",
    uniqueConstraints = @UniqueConstraint(columnNames = {"show_id","seat_id"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
class ShowSeatStatus {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Enumerated(EnumType.STRING)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    public enum SeatStatus { AVAILABLE, BOOKED, BLOCKED }
}
