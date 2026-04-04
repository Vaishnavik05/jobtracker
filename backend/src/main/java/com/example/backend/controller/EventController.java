package com.example.backend.controller;

import com.example.backend.model.CompanyEvent;
import com.example.backend.repository.CompanyEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class EventController {

    private final CompanyEventRepository repo;

    @GetMapping
    public ResponseEntity<List<CompanyEvent>> all() {
        return ResponseEntity.ok(repo.findAll());
    }
}
