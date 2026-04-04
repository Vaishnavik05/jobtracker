package com.example.backend.repository;

import com.example.backend.model.CompanyEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyEventRepository extends JpaRepository<CompanyEvent, Long> {
}
