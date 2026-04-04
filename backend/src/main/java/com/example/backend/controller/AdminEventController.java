package com.example.backend.controller;

import com.example.backend.model.CompanyEvent;
import com.example.backend.repository.CompanyEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AdminEventController {

    private final CompanyEventRepository repo;

    @GetMapping
    public ResponseEntity<List<CompanyEvent>> all() {
        return ResponseEntity.ok(repo.findAll());
    }

    @PostMapping
    public ResponseEntity<CompanyEvent> create(@RequestBody CompanyEvent event) {
        return ResponseEntity.ok(repo.save(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompanyEvent> update(@PathVariable Long id, @RequestBody CompanyEvent event) {
        CompanyEvent existing = repo.findById(id).orElseThrow();
        existing.setCompanyName(event.getCompanyName());
        existing.setEventTitle(event.getEventTitle());
        existing.setDescription(event.getDescription());
        existing.setApplyUrl(event.getApplyUrl());
        existing.setEventDate(event.getEventDate());
        return ResponseEntity.ok(repo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
