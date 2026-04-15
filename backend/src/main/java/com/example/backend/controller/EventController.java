package com.example.backend.controller;

import com.example.backend.model.CompanyEvent;
import com.example.backend.repository.CompanyEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
// @CrossOrigin(origins = {
//     "http://localhost:5173",
//     "https://jobtracker-xv7i.vercel.app"
// })
public class EventController {

    private final CompanyEventRepository repo;

    @GetMapping
    public ResponseEntity<List<CompanyEvent>> all() {
        return ResponseEntity.ok(repo.findAll());
    }
}
