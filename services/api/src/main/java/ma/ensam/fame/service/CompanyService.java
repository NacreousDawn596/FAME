package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Company;
import ma.ensam.fame.domain.Recruiter;
import ma.ensam.fame.repository.CompanyRepository;
import ma.ensam.fame.repository.RecruiterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final RecruiterRepository recruiterRepository;

    public CompanyService(CompanyRepository companyRepository, RecruiterRepository recruiterRepository) {
        this.companyRepository = companyRepository;
        this.recruiterRepository = recruiterRepository;
    }

    @Transactional
    public Company create(String name, String description, String logoUrl) {
        Company company = new Company();
        company.setName(name);
        company.setDescription(description);
        company.setLogoUrl(logoUrl);
        return companyRepository.save(company);
    }

    @Transactional(readOnly = true)
    public List<Company> list() {
        return companyRepository.findAll();
    }

    @Transactional
    public Recruiter createRecruiter(UUID companyId, String fullName, String email, String title, String photoUrl) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> ApiException.notFound("COMPANY_NOT_FOUND", "Company not found"));
        Recruiter recruiter = new Recruiter();
        recruiter.setCompany(company);
        recruiter.setFullName(fullName);
        recruiter.setEmail(email);
        recruiter.setTitle(title);
        recruiter.setPhotoUrl(photoUrl);
        return recruiterRepository.save(recruiter);
    }

    @Transactional(readOnly = true)
    public List<Recruiter> recruiters(UUID companyId) {
        return recruiterRepository.findByCompanyId(companyId);
    }
}
