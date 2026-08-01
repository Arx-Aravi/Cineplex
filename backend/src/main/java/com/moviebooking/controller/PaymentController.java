package com.moviebooking.controller;

import com.moviebooking.service.RazorpayService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final RazorpayService razorpayService;

    /**
     * Step 1 of the Razorpay flow: the frontend calls this BEFORE opening
     * Checkout. We create the order using our Key Secret (kept server-side)
     * and return just the order_id + publishable Key ID.
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody CreateOrderRequest request) {
        try {
            Map<String, Object> order = razorpayService.createOrder(
                    request.getAmount(), request.getReceipt());
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            log.error("Razorpay order creation failed", e);
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Could not create payment order. " + e.getMessage()));
        }
    }

    /**
     * Step 2: after Checkout completes, the frontend sends back the three
     * values Razorpay gave it. We verify the signature here — never trust
     * a "payment successful" claim from the browser alone.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyRequest request) {
        boolean valid = razorpayService.verifySignature(
                request.getRazorpayOrderId(),
                request.getRazorpayPaymentId(),
                request.getRazorpaySignature());

        if (!valid) {
            return ResponseEntity.status(400).body(Map.of("verified", false, "message", "Signature mismatch"));
        }
        return ResponseEntity.ok(Map.of("verified", true));
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class CreateOrderRequest {
        @NotNull @Positive
        private Long amount;       // rupees, not paise
        @NotBlank
        private String receipt;    // e.g. booking reference
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class VerifyRequest {
        @NotBlank private String razorpayOrderId;
        @NotBlank private String razorpayPaymentId;
        @NotBlank private String razorpaySignature;
    }
}
