package com.verita.userservice.controller;

import com.verita.api.HealthApi;
import com.verita.api.UsersApi;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")
public class HealthController implements HealthApi {


    /**
     * GET /health : Health check
     *
     * @return Service is healthy. (status code 200)
     * or Service unavailable. (status code 503)
     * or Invalid request. (status code 400)
     */
    @Override
    public ResponseEntity<Void> healthCheck() {
        return ResponseEntity.ok().build();
        //TODO implement 503 and 400
    }
}
