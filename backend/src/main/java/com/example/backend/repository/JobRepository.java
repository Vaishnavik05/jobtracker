package com.example.backend.repository;

import com.example.backend.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByUserId(Long userId);

    List<Job> findByUserIdAndStatus(Long userId, String status);

    List<Job> findByUserIdAndCompanyIgnoreCase(Long userId, String company);

    List<Job> findByUserIdAndStatusAndCompanyIgnoreCase(Long userId, String status, String company);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, String status);

    List<Job> findByUserIsNull();

    List<Job> findByUserIsNotNull();

    boolean existsByUserIdAndCompanyIgnoreCaseAndRoleIgnoreCase(Long userId, String company, String role);

    @Query("select count(distinct j.user.id) from Job j where j.user is not null")
    long countDistinctUsersWithApplications();

    @Query("select count(distinct lower(j.company)) from Job j where j.company is not null and trim(j.company) <> ''")
    long countDistinctCompanies();

    @Query("select count(distinct j.user.id) from Job j where j.user is not null and (j.status = 'HR Interview' or j.status = 'Offer')")
    long countDistinctUsersWithOffers();

    @Query("select j.status, count(j) from Job j where j.user is not null and j.status is not null group by j.status")
    List<Object[]> countByStatusGrouped();

    @Query("""
        select j
        from Job j
        left join j.user u
        where u is null
           or lower(coalesce(u.username, '')) = 'admin'
        order by j.id desc
    """)
    List<Job> findPublicJobs();

    @Query("""
        select (count(j) > 0) from Job j
        where j.user is null
          and lower(j.company) = lower(:company)
          and lower(j.role) = lower(:role)
          and lower(coalesce(j.location, '')) = lower(coalesce(:location, ''))
    """)
    boolean existsPublicDuplicate(@Param("company") String company,
                                  @Param("role") String role,
                                  @Param("location") String location);

    @Query("""
        select (count(j) > 0) from Job j
        where j.user is null
          and lower(j.company) = lower(:company)
          and lower(j.role) = lower(:role)
          and lower(coalesce(j.location, '')) = lower(coalesce(:location, ''))
          and j.appliedDate = :appliedDate
    """)
    boolean existsPublicDuplicate(@Param("company") String company,
                                  @Param("role") String role,
                                  @Param("location") String location,
                                  @Param("appliedDate") LocalDate appliedDate);

    @Query("select count(j) from Job j where j.user is not null")
    long countUserApplications();

    @Query("select count(j) from Job j where j.user is null")
    long countPostedJobsForAdmin();

    @Query("select count(distinct lower(j.company)) from Job j where j.user is null and j.company is not null and trim(j.company) <> ''")
    long countDistinctPostedCompanies();
}

