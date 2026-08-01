package com.moviebooking.service;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RazorpayService {

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    /**
     * Creates a Razorpay Order server-side. The Key Secret never leaves this
     * method — only the publishable Key ID and the resulting order_id are
     * returned to the browser, which is what Razorpay Checkout needs.
     */
    public Map<String, Object> createOrder(long amountInRupees, String receiptRef) throws RazorpayException {
        RazorpayClient client = new RazorpayClient(keyId, keySecret);

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInRupees * 100); // paise
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", receiptRef);
        orderRequest.put("payment_capture", 1);

        com.razorpay.Order order = client.orders.create(orderRequest);

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.get("id").toString());
        response.put("amount", order.get("amount"));
        response.put("currency", order.get("currency"));
        response.put("keyId", keyId); // safe to expose — it's the publishable key
        return response;
    }

    /**
     * Verifies the HMAC-SHA256 signature Razorpay sends back after checkout
     * completes, proving the payment response wasn't tampered with client-side.
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(options, keySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }
}
