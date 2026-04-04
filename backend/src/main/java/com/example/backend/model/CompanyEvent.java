package com.example.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String companyName;
    private String eventTitle;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String description;

    private String applyUrl;
    private LocalDate eventDate;

    private LocalDateTime createdAt = LocalDateTime.now();
}
