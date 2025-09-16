// Global variables and constants
const COLLEGE_SCORECARD_API_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools';
const API_KEY = 'eFgA3LJ2cWuPg48iaJ22DsSiqvp8fpeDrmtiWRrg';

let searchDebounceTimer = null;
let currentSearchRequest = null;
let isUserTriggeredSave = false;

// Global function to select university from search results
function selectUniversity(name, location, website, email, phone) {
    // Reset editing state to ensure this is treated as a new university
    editingId = null;
    
    // Update modal title and button text for adding new university
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');
    if (modalTitle) modalTitle.textContent = 'Add University';
    if (saveBtn) {
        const btnText = saveBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Save University';
    }

    // Get the university modal and form fields
    const universityNameInput = document.getElementById('universityName');
    const universityLocationInput = document.getElementById('universityLocation');
    const universityWebsiteInput = document.getElementById('universityWebsite');
    const admissionsEmailInput = document.getElementById('admissionsEmail');
    const admissionsPhoneInput = document.getElementById('admissionsPhone');

    // Clear the form first to ensure clean state
    const universityForm = document.getElementById('universityForm');
    if (universityForm) {
        universityForm.reset();
    }

    // Populate the form fields with the selected university data
    if (universityNameInput) universityNameInput.value = name;
    if (universityLocationInput) universityLocationInput.value = location;
    if (universityWebsiteInput && website) universityWebsiteInput.value = website;
    if (admissionsEmailInput && email) admissionsEmailInput.value = email;
    if (admissionsPhoneInput && phone) admissionsPhoneInput.value = phone;

    // Hide search results and show the form
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }

    // Hide search section and show the university form section
    const searchSection = document.querySelector('.university-search-section');
    const universityFormSection = document.getElementById('universityFormSection');
    if (searchSection) {
        searchSection.style.display = 'none';
    }
    if (universityFormSection) {
        universityFormSection.style.display = 'block';
    }

    console.log('University selected (not saved yet):', name);
}

// Global function to show university details from search (new function)
function showUniversityDetailsFromSearch(name, location, website, email, phone) {
    const modal = document.getElementById('universityDetailsModal');
    
    // Hide search results
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    // Populate modal with university data
    const initialElement = document.getElementById('universityInitial');
    if (initialElement && name) {
        initialElement.textContent = name.charAt(0).toUpperCase();
    }
    
    const nameElement = document.getElementById('detailsUniversityName');
    if (nameElement) {
        nameElement.textContent = name;
    }
    
    const locationElement = document.getElementById('detailsUniversityLocation');
    if (locationElement) {
        locationElement.textContent = location || 'Location not specified';
    }
    
    const statusElement = document.getElementById('modalUniversityStatus');
    if (statusElement) {
        statusElement.textContent = 'Not Added';
        statusElement.className = 'status-pill planning';
    }
    
    // Clear other fields since this is from search
    const deadlineElement = document.getElementById('detailsApplicationDeadline');
    if (deadlineElement) {
        deadlineElement.textContent = 'Not set';
        const countdownElement = document.getElementById('deadlineCountdown');
        if (countdownElement) countdownElement.style.display = 'none';
    }
    
    const feeElement = document.getElementById('detailsApplicationFee');
    if (feeElement) {
        feeElement.textContent = 'Not set';
    }
    
    const semesterElement = document.getElementById('modalUniversitySemester');
    if (semesterElement) {
        semesterElement.textContent = 'Not specified';
    }
    
    const websiteElement = document.getElementById('detailsUniversityWebsite');
    if (websiteElement) {
        if (website && website.trim() !== '') {
            websiteElement.innerHTML = `<a href="${website}" target="_blank">${website}</a>`;
        } else {
            websiteElement.textContent = 'Not set';
        }
    }
    
    // Contact information
    const admissionsEmailElement = document.getElementById('detailsAdmissionsEmail');
    if (admissionsEmailElement) {
        if (email && email.trim() !== '') {
            admissionsEmailElement.innerHTML = `<a href="mailto:${email}">${email}</a>`;
        } else {
            admissionsEmailElement.textContent = 'Not provided';
        }
    }
    
    const admissionsPhoneElement = document.getElementById('detailsAdmissionsPhone');
    if (admissionsPhoneElement) {
        if (phone && phone.trim() !== '') {
            admissionsPhoneElement.innerHTML = `<a href="tel:${phone}">${phone}</a>`;
        } else {
            admissionsPhoneElement.textContent = 'Not provided';
        }
    }
    
    const contactPersonElement = document.getElementById('detailsContactPerson');
    if (contactPersonElement) {
        contactPersonElement.textContent = 'Not provided';
    }
    
    const officeHoursElement = document.getElementById('detailsOfficeHours');
    if (officeHoursElement) {
        officeHoursElement.textContent = 'Not provided';
    }
    
    // Clear requirements and notes
    const requirementsElement = document.getElementById('requirementsChecklist');
    const requirementsSection = document.getElementById('requirementsSection');
    if (requirementsElement && requirementsSection) {
        requirementsElement.innerHTML = '<div class="no-requirements">No requirements specified</div>';
        requirementsSection.style.display = 'block';
    }
    
    const notesElement = document.getElementById('notesContent');
    const notesSection = document.getElementById('notesSection');
    if (notesElement && notesSection) {
        notesElement.textContent = 'No notes added';
        notesSection.style.display = 'block';
    }
    
    // Update edit button to add this university
    const editButton = document.getElementById('editUniversityBtn');
    if (editButton) {
        editButton.innerHTML = '<i class="fas fa-plus"></i> Add This University';
        editButton.onclick = () => {
            modal.style.display = 'none';
            modal.classList.remove('active');
            // Call the function that opens the form for editing (but doesn't auto-save)
            selectUniversityForEdit(name, location, website, email, phone);
        };
    }
    
    modal.style.display = 'flex';
    modal.classList.add('active');
}

// Global function to select university for editing (replaces old selectUniversity for edit mode)
function selectUniversityForEdit(name, location, website, email, phone) {
    console.log('selectUniversityForEdit called with:', name);
    
    // Reset editing state to ensure this is treated as a new university
    editingId = null;
    console.log('editingId reset to null');
    
    // Reset selectedUniversityData to prevent auto-save
    selectedUniversityData = null;
    console.log('selectedUniversityData reset to null');
    
    // Reset the save trigger flag
    isUserTriggeredSave = false;
    console.log('isUserTriggeredSave reset to false');
    
    // Update modal title and button text for adding new university
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');
    if (modalTitle) {
        modalTitle.textContent = 'Add University';
        console.log('Modal title set to Add University');
    }
    if (saveBtn) {
        const btnText = saveBtn.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = 'Save University';
            console.log('Save button text set to Save University');
        }
    }

    // Get the university modal and form fields
    const universityNameInput = document.getElementById('universityName');
    const universityLocationInput = document.getElementById('universityLocation');
    const universityWebsiteInput = document.getElementById('universityWebsite');
    const admissionsEmailInput = document.getElementById('admissionsEmail');
    const admissionsPhoneInput = document.getElementById('admissionsPhone');

    // Clear the form first to ensure clean state
    const universityForm = document.getElementById('universityForm');
    if (universityForm) {
        universityForm.reset();
        console.log('Form reset completed');
    }

    // Populate the form fields with the selected university data
    if (universityNameInput) {
        universityNameInput.value = name;
        console.log('Name field populated:', name);
    }
    if (universityLocationInput) {
        universityLocationInput.value = location;
        console.log('Location field populated:', location);
    }
    if (universityWebsiteInput && website) {
        universityWebsiteInput.value = website;
        console.log('Website field populated:', website);
    }
    if (admissionsEmailInput && email) {
        admissionsEmailInput.value = email;
        console.log('Email field populated:', email);
    }
    if (admissionsPhoneInput && phone) {
        admissionsPhoneInput.value = phone;
        console.log('Phone field populated:', phone);
    }

    // Hide search results and show the form
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
        console.log('Search results hidden');
    }

    // Hide search section and show the university form section
    const searchSection = document.querySelector('.university-search-section');
    const universityFormSection = document.getElementById('universityFormSection');
    if (searchSection) {
        searchSection.style.display = 'none';
        console.log('Search section hidden');
    }
    if (universityFormSection) {
        universityFormSection.style.display = 'block';
        console.log('Form section shown');
    }

    // Open the university modal if it's not open
    const universityModal = document.getElementById('universityModal');
    if (universityModal) {
        if (!universityModal.classList.contains('active')) {
            universityModal.classList.add('active');
            universityModal.style.display = 'flex';
            console.log('Modal opened');
        } else {
            console.log('Modal was already active');
        }
    }

    console.log('selectUniversityForEdit completed - university NOT saved yet, waiting for user to click Save');
}

// Helper functions for search UI
function showSearchLoading() {
    const searchLoading = document.getElementById('searchLoading');
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    const searchWrapper = document.querySelector('.search-input-wrapper');
    
    if (searchLoading) {
        searchLoading.style.display = 'block';
    }
    
    if (searchWrapper) {
        searchWrapper.classList.add('loading');
    }
    
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    if (searchStats) {
        searchStats.style.display = 'none';
    }
}

function hideSearchLoading() {
    const searchLoading = document.getElementById('searchLoading');
    const searchWrapper = document.querySelector('.search-input-wrapper');
    
    if (searchLoading) {
        searchLoading.style.display = 'none';
    }
    
    if (searchWrapper) {
        searchWrapper.classList.remove('loading');
    }
}

function hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    if (searchStats) {
        searchStats.style.display = 'none';
    }
}

// Global search function
async function searchUniversities(query) {
    console.log('Starting search for:', query);
    
    if (currentSearchRequest) {
        currentSearchRequest.abort();
    }

    try {
        const controller = new AbortController();
        currentSearchRequest = controller;

        let universities = [];
        
        try {
            // Use College Scorecard API for comprehensive US university data
            const params = new URLSearchParams({
                'school.name': query,
                'school.operating': 1,
                'school.degrees_awarded.predominant__range': '1..4',
                '_fields': 'id,school.name,school.city,school.state,school.zip,school.school_url,school.price_calculator_url,location.lat,location.lon,school.main_campus,school.ownership,school.locale,school.religious_affiliation,school.minority_serving.historically_black,school.minority_serving.predominantly_black,school.minority_serving.annh,school.minority_serving.tribal,school.minority_serving.aanipi,school.minority_serving.hispanic,school.minority_serving.nant,school.carnegie_basic,school.degrees_awarded.predominant,school.degrees_awarded.highest,school.undergraduate_offering,admissions.admission_rate.overall,latest.admissions.sat_scores.average.overall,latest.admissions.sat_scores.25th_percentile.critical_reading,latest.admissions.sat_scores.75th_percentile.critical_reading,latest.admissions.sat_scores.25th_percentile.math,latest.admissions.sat_scores.75th_percentile.math,latest.admissions.act_scores.25th_percentile.cumulative,latest.admissions.act_scores.75th_percentile.cumulative,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state,latest.cost.avg_net_price.overall,latest.aid.pell_grant_rate,latest.aid.median_debt.completers.overall,latest.student.size,latest.student.part_time_share,latest.student.demographics.female,latest.student.demographics.race_ethnicity.white,latest.student.demographics.race_ethnicity.black,latest.student.demographics.race_ethnicity.hispanic,latest.student.demographics.race_ethnicity.asian,latest.student.demographics.first_generation,latest.student.demographics.age_entry,latest.completion.completion_rate_4yr_150nt,latest.completion.rate_suppressed.overall,latest.student.retention_rate.four_year.full_time,latest.student.transfer_rate.four_year.full_time,latest.earnings.6_yrs_after_entry.median,latest.earnings.10_yrs_after_entry.median,latest.repayment.repayment_rate.1_yr,latest.completion.consumer_rate,latest.aid.federal_loan_rate',
                '_per_page': 50,
                '_sort': 'school.name:asc'
            });

            const response = await fetch(`${COLLEGE_SCORECARD_API_URL}?${params}&api_key=${API_KEY}`, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });

            if (response.ok) {
                const data = await response.json();
                universities = data.results || [];
                console.log(`Raw API response:`, data);
                console.log(`Found ${universities.length} universities from College Scorecard API`);
                console.log('First university raw data:', universities[0]);
                
                // Transform College Scorecard data to our expected format
                universities = universities.map(uni => {
                    console.log('Raw university object:', JSON.stringify(uni, null, 2));
                    
                    // Try different possible field structures
                    const name = uni['school.name'] || uni.school?.name || uni.name || 'Unknown University';
                    const state = uni['school.state'] || uni.school?.state || uni.state || '';
                    const city = uni['school.city'] || uni.school?.city || uni.city || '';
                    const zip = uni['school.zip'] || uni.school?.zip || uni.zip || '';
                    const school_url = uni['school.school_url'] || uni.school?.school_url || uni.school_url || '';
                    const lat = uni['location.lat'] || uni.location?.lat || uni.lat || null;
                    const lon = uni['location.lon'] || uni.location?.lon || uni.lon || null;
                    
                    const transformed = {
                        id: uni.id,
                        name: name,
                        country: 'United States',
                        state: state,
                        city: city,
                        zip: zip,
                        web_pages: school_url ? [school_url] : [],
                        price_calculator_url: uni['school.price_calculator_url'] || uni.school?.price_calculator_url || '',
                        latitude: lat,
                        longitude: lon,
                        main_campus: (uni['school.main_campus'] || uni.school?.main_campus) === 1,
                        ownership: (uni['school.ownership'] || uni.school?.ownership) === 1 ? 'Public' : 
                                  (uni['school.ownership'] || uni.school?.ownership) === 2 ? 'Private nonprofit' : 
                                  (uni['school.ownership'] || uni.school?.ownership) === 3 ? 'Private for-profit' : 'Unknown',
                        locale: uni['school.locale'] || uni.school?.locale || null,
                        religious_affiliation: uni['school.religious_affiliation'] || uni.school?.religious_affiliation || null,
                        historically_black: uni['school.minority_serving.historically_black'] || uni.school?.minority_serving?.historically_black || false,
                        predominantly_black: uni['school.minority_serving.predominantly_black'] || uni.school?.minority_serving?.predominantly_black || false,
                        hispanic_serving: uni['school.minority_serving.hispanic'] || uni.school?.minority_serving?.hispanic || false,
                        tribal: uni['school.minority_serving.tribal'] || uni.school?.minority_serving?.tribal || false,
                        asian_serving: uni['school.minority_serving.aanipi'] || uni.school?.minority_serving?.aanipi || false,
                        native_american_serving: uni['school.minority_serving.nant'] || uni.school?.minority_serving?.nant || false,
                        carnegie_basic: uni['school.carnegie_basic'] || uni.school?.carnegie_basic || null,
                        degrees_awarded_predominant: uni['school.degrees_awarded.predominant'] || uni.school?.degrees_awarded?.predominant || null,
                        degrees_awarded_highest: uni['school.degrees_awarded.highest'] || uni.school?.degrees_awarded?.highest || null,
                        undergraduate_offering: uni['school.undergraduate_offering'] || uni.school?.undergraduate_offering || null,
                        admission_rate: uni['admissions.admission_rate.overall'] || uni.admissions?.admission_rate?.overall || null,
                        sat_average: uni['latest.admissions.sat_scores.average.overall'] || uni.latest?.admissions?.sat_scores?.average?.overall || null,
                        sat_reading_25th: uni['latest.admissions.sat_scores.25th_percentile.critical_reading'] || uni.latest?.admissions?.sat_scores?.['25th_percentile']?.critical_reading || null,
                        sat_reading_75th: uni['latest.admissions.sat_scores.75th_percentile.critical_reading'] || uni.latest?.admissions?.sat_scores?.['75th_percentile']?.critical_reading || null,
                        sat_math_25th: uni['latest.admissions.sat_scores.25th_percentile.math'] || uni.latest?.admissions?.sat_scores?.['25th_percentile']?.math || null,
                        sat_math_75th: uni['latest.admissions.sat_scores.75th_percentile.math'] || uni.latest?.admissions?.sat_scores?.['75th_percentile']?.math || null,
                        act_cumulative_25th: uni['latest.admissions.act_scores.25th_percentile.cumulative'] || uni.latest?.admissions?.act_scores?.['25th_percentile']?.cumulative || null,
                        act_cumulative_75th: uni['latest.admissions.act_scores.75th_percentile.cumulative'] || uni.latest?.admissions?.act_scores?.['75th_percentile']?.cumulative || null,
                        tuition_in_state: uni['latest.cost.tuition.in_state'] || uni.latest?.cost?.tuition?.in_state || null,
                        tuition_out_state: uni['latest.cost.tuition.out_of_state'] || uni.latest?.cost?.tuition?.out_of_state || null,
                        avg_net_price: uni['latest.cost.avg_net_price.overall'] || uni.latest?.cost?.avg_net_price?.overall || null,
                        pell_grant_rate: uni['latest.aid.pell_grant_rate'] || uni.latest?.aid?.pell_grant_rate || null,
                        federal_loan_rate: uni['latest.aid.federal_loan_rate'] || uni.latest?.aid?.federal_loan_rate || null,
                        median_debt: uni['latest.aid.median_debt.completers.overall'] || uni.latest?.aid?.median_debt?.completers?.overall || null,
                        student_size: uni['latest.student.size'] || uni.latest?.student?.size || null,
                        part_time_share: uni['latest.student.part_time_share'] || uni.latest?.student?.part_time_share || null,
                        female_share: uni['latest.student.demographics.female'] || uni.latest?.student?.demographics?.female || null,
                        white_share: uni['latest.student.demographics.race_ethnicity.white'] || uni.latest?.student?.demographics?.race_ethnicity?.white || null,
                        black_share: uni['latest.student.demographics.race_ethnicity.black'] || uni.latest?.student?.demographics?.race_ethnicity?.black || null,
                        hispanic_share: uni['latest.student.demographics.race_ethnicity.hispanic'] || uni.latest?.student?.demographics?.race_ethnicity?.hispanic || null,
                        asian_share: uni['latest.student.demographics.race_ethnicity.asian'] || uni.latest?.student?.demographics?.race_ethnicity?.asian || null,
                        first_generation: uni['latest.student.demographics.first_generation'] || uni.latest?.student?.demographics?.first_generation || null,
                        age_entry: uni['latest.student.demographics.age_entry'] || uni.latest?.student?.demographics?.age_entry || null,
                        completion_rate_4yr: uni['latest.completion.completion_rate_4yr_150nt'] || uni.latest?.completion?.completion_rate_4yr_150nt || null,
                        completion_rate_overall: uni['latest.completion.rate_suppressed.overall'] || uni.latest?.completion?.rate_suppressed?.overall || null,
                        retention_rate: uni['latest.student.retention_rate.four_year.full_time'] || uni.latest?.student?.retention_rate?.four_year?.full_time || null,
                        transfer_rate: uni['latest.student.transfer_rate.four_year.full_time'] || uni.latest?.student?.transfer_rate?.four_year?.full_time || null,
                        median_earnings_6yr: uni['latest.earnings.6_yrs_after_entry.median'] || uni.latest?.earnings?.['6_yrs_after_entry']?.median || null,
                        median_earnings_10yr: uni['latest.earnings.10_yrs_after_entry.median'] || uni.latest?.earnings?.['10_yrs_after_entry']?.median || null,
                        repayment_rate: uni['latest.repayment.repayment_rate.1_yr'] || uni.latest?.repayment?.repayment_rate?.['1_yr'] || null,
                        employment_rate: uni['latest.completion.consumer_rate'] || uni.latest?.completion?.consumer_rate || null,
                        employment_rate: uni['latest.completion.consumer_rate'] || uni.latest?.completion?.consumer_rate || null,
                        admissions_email: generateAdmissionsEmail(name, school_url),
                        phone: null
                    };
                    
                    console.log('Transformed university:', transformed);
                    return transformed;
                });
            } else {
                throw new Error(`College Scorecard API request failed with status: ${response.status}`);
            }
        } catch (apiError) {
            if (apiError.name === 'AbortError') {
                return [];
            }
            console.error('College Scorecard API failed:', apiError.message);
            throw new Error('Unable to search universities. Please try again later.');
        }

        console.log('Returning search results:', universities);
        return universities;

    } catch (error) {
        if (error.name === 'AbortError') {
            return [];
        }
        console.error('Search error:', error);
        throw error;
    }
}

// Helper function to generate reasonable admissions email addresses
function generateAdmissionsEmail(schoolName, schoolUrl) {
    if (!schoolName) return '';
    
    let domain = '';
    if (schoolUrl) {
        try {
            const url = new URL(schoolUrl);
            domain = url.hostname.replace('www.', '');
        } catch (e) {
            // If URL parsing fails, try to extract domain from school name
            domain = schoolName.toLowerCase()
                .replace(/university|college|institute|school/g, '')
                .replace(/[^a-z0-9\s]/g, '')
                .trim()
                .replace(/\s+/g, '') + '.edu';
        }
    } else {
        // Generate domain from school name
        domain = schoolName.toLowerCase()
            .replace(/university|college|institute|school/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '') + '.edu';
    }
    
    return `admissions@${domain}`;
}

// Global display results function
function displaySearchResults(universities, query) {
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    
    if (!searchResults || !searchStats) {
        console.error('Search results elements not found');
        return;
    }

    console.log('Displaying', universities.length, 'search results');

    // Show search statistics
    searchStats.style.display = 'block';
    const resultsCountElement = searchStats.querySelector('.results-count');
    if (resultsCountElement) {
        resultsCountElement.textContent = 
            `${universities.length} result${universities.length !== 1 ? 's' : ''} found`;
    }

    if (universities.length === 0) {
        showNoResults(query);
        return;
    }

    // Clear previous results and show the container
    searchResults.innerHTML = '';
    searchResults.style.display = 'block';

    // Create the search results list if it doesn't exist
    let searchResultsList = document.getElementById('searchResultsList');
    if (!searchResultsList) {
        searchResultsList = document.createElement('div');
        searchResultsList.id = 'searchResultsList';
        searchResultsList.className = 'search-results-list';
        searchResults.appendChild(searchResultsList);
    } else {
        searchResultsList.innerHTML = '';
    }
    
    universities.forEach((university, index) => {
        const resultItem = createSearchResultItem(university);
        searchResultsList.appendChild(resultItem);
        console.log(`Added result item ${index + 1}:`, university.name);
    });

    // Force display the search results with important overrides
    searchResults.style.setProperty('display', 'block', 'important');
    searchResults.style.setProperty('visibility', 'visible', 'important');
    searchResults.style.setProperty('opacity', '1', 'important');
    searchResults.style.setProperty('max-height', 'none', 'important');
    searchResults.style.setProperty('height', 'auto', 'important');
    searchResults.style.setProperty('z-index', '2000', 'important');
    
    // Make sure parent container is also visible
    const searchSection = searchResults.closest('.university-search-section');
    if (searchSection) {
        searchSection.style.display = 'block';
    }

    console.log('Search results should now be visible');
}

// Global function to create search result items
function createSearchResultItem(university) {
    const div = document.createElement('div');
    div.className = 'search-result-item';

    const name = university.name || 'Unknown University';
    const state = university.state || '';
    const city = university.city || '';
    const zip = university.zip || '';
    const country = university.country || 'United States';
    const website = university.web_pages && university.web_pages[0] ? university.web_pages[0] : '';
    const email = university.admissions_email || '';
    const phone = university.phone || '';
    const ownership = university.ownership || '';
    const admissionRate = university.admission_rate;
    const satAverage = university.sat_average;

    let locationText = '';
    try {
        if (city && state) {
            locationText = zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`;
        } else if (state) {
            locationText = state;
        } else if (city) {
            locationText = city;
        } else {
            // Try to extract state from name using our enhanced function
            const extractedState = extractStateFromUniversityName(name);
            if (extractedState) {
                locationText = extractedState;
            } else {
                locationText = 'United States';
            }
        }
    } catch (error) {
        console.error('Error processing location:', error);
        locationText = 'Location not available';
    }

    // Create additional info section for College Scorecard data
    let additionalInfo = '';
    if (ownership || admissionRate || satAverage) {
        additionalInfo = '<div class="result-additional-info">';
        if (ownership) {
            additionalInfo += `<span class="info-tag ownership">${ownership}</span>`;
        }
        if (admissionRate) {
            additionalInfo += `<span class="info-tag admission-rate">Admission Rate: ${(admissionRate * 100).toFixed(1)}%</span>`;
        }
        if (satAverage) {
            additionalInfo += `<span class="info-tag sat-score">Avg SAT: ${satAverage}</span>`;
        }
        additionalInfo += '</div>';
    }

    div.innerHTML = `
        <div class="result-header">
            <div class="result-main">
                <div class="result-name">${name}</div>
                <div class="result-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${locationText}
                </div>
                ${additionalInfo}
            </div>
            <div class="result-actions">
                <button class="result-details-btn" onclick="showUniversityInfoModal(${JSON.stringify(university).replace(/"/g, '&quot;')})">
                    <i class="fas fa-info-circle"></i>
                    Show Details
                </button>
                <button class="result-select-btn" onclick="selectUniversityForEdit('${name.replace(/'/g, "\\'")}', '${locationText.replace(/'/g, "\\'")}', '${website}', '${email}', '${phone}')">
                    <i class="fas fa-edit"></i>
                    Edit & Add
                </button>
            </div>
        </div>
        ${website ? `
            <div class="result-footer">
                <a href="${website}" target="_blank" class="result-website">
                    <i class="fas fa-external-link-alt"></i>
                    Visit Website
                </a>
                ${university.price_calculator_url ? `
                    <a href="${university.price_calculator_url}" target="_blank" class="result-calculator">
                        <i class="fas fa-calculator"></i>
                        Price Calculator
                    </a>
                ` : ''}
            </div>
        ` : ''}
    `;

    return div;
}

// Global function to show no results
function showNoResults(query) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    searchResults.innerHTML = `
        <div class="search-no-results">
            <i class="fas fa-search"></i>
            <h4>No universities found</h4>
            <p>No results for "${query}". Try adjusting your search:</p>
            <ul>
                <li>Check the spelling of the university name</li>
                <li>Try searching with partial names (e.g., "Harvard" instead of "Harvard University")</li>
                <li>Use abbreviations or common names (e.g., "MIT", "UCLA")</li>
                <li>Search by city or state if the exact name isn't working</li>
            </ul>
            <p>You can also use manual entry to add universities not found in the database.</p>
        </div>
    `;
    searchResults.style.display = 'block';
}

// Global function to show search error
function showSearchError(message) {
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    
    if (!searchResults) return;

    // Hide stats and show error
    if (searchStats) {
        searchStats.style.display = 'none';
    }

    searchResults.innerHTML = `
        <div class="search-error">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="search-error-content">
                <h4>Search Error</h4>
                <p>${message}</p>
                <div class="search-error-actions">
                    <button onclick="retryLastSearch()" class="btn btn-outline-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                    <button onclick="clearSearch()" class="btn btn-outline-secondary">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            </div>
        </div>
    `;
    searchResults.style.display = 'block';
}

// Helper functions for error handling
let lastSearchQuery = '';

function retryLastSearch() {
    if (lastSearchQuery) {
        const searchInput = document.getElementById('universitySearchInput');
        if (searchInput) {
            searchInput.value = lastSearchQuery;
            performUniversitySearch();
        }
    }
}

function clearSearch() {
    const searchInput = document.getElementById('universitySearchInput');
    const searchResults = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    if (searchStats) {
        searchStats.style.display = 'none';
    }
    
    lastSearchQuery = '';
}

// Global function to extract state from university name
function extractStateFromUniversityName(name) {
    if (!name) return null;
    
    // Common patterns for extracting state from university names
    const statePatterns = [
        // University of [State] pattern
        /University of (Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)/i,
        
        // [State] University/State/Institute/College pattern
        /(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\s+(University|State|Institute|College)/i
    ];
    
    for (const pattern of statePatterns) {
        const match = name.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    // Special cases for commonly abbreviated names
    const specialCases = {
        'MIT': 'Massachusetts',
        'Caltech': 'California',
        'UCLA': 'California',
        'USC': 'California',
        'NYU': 'New York',
        'Georgia Tech': 'Georgia',
        'Virginia Tech': 'Virginia'
    };
    
    for (const [abbrev, state] of Object.entries(specialCases)) {
        if (name.includes(abbrev)) {
            return state;
        }
    }
    
    return null;
}

// Global function to format location display
function formatLocationDisplay(location) {
    if (!location) return 'Location not specified';
    
    // If it's a string that includes "United States" and has comma-separated parts
    if (typeof location === 'string' && location.includes('United States')) {
        const parts = location.split(',').map(part => part.trim());
        if (parts.length >= 2) {
            // Remove "United States" and return the remaining parts
            const filtered = parts.filter(part => part !== 'United States');
            return filtered.join(', ');
        }
    }
    
    // If it's an object with state/city information
    if (typeof location === 'object' && location !== null) {
        const state = location.state || location['state-province'] || '';
        const city = location.city || '';
        
        if (city && state) {
            return `${city}, ${state}`;
        } else if (state) {
            return state;
        } else if (city) {
            return city;
        }
    }
    
    return location;
}

document.addEventListener('DOMContentLoaded', async function() {
    await initializeAuth();
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        document.addEventListener('click', function(event) {
            if (!mobileMenuBtn.contains(event.target) && !navMenu.contains(event.target)) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    
    let countdownInterval = null;
    let selectedUniversityData = null;

    let universities = [];
    let editingId = null;

    const universitiesGrid = document.getElementById('universitiesGrid');
    const universityModal = document.getElementById('universityModal');
    const deleteModal = document.getElementById('deleteModal');
    const universityDetailsModal = document.getElementById('universityDetailsModal');
    const universityForm = document.getElementById('universityForm');
    const searchInput = document.getElementById('searchInput');
    const statusFilterSelect = document.getElementById('filterStatus');
    const emptyState = document.getElementById('emptyState');
    const addUniversityBtn = document.getElementById('addUniversityBtn');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const editFromDetailsBtn = document.getElementById('editFromDetailsBtn');
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');

    let deleteUniversityId = null;
    let currentUniversityDetails = null;

    showLoading();
    await loadUniversities();
    hideLoading();
    renderUniversities();

    async function loadUniversities() {
        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('universities').orderBy('createdAt', 'asc').get();
            universities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading universities:', error);
            showNotification('Error loading universities', 'error');
        }
    }

    function renderUniversities(filteredUniversities = universities) {
        hideLoading();
        updateStatistics();
        
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
        
        if (filteredUniversities.length === 0) {
            const existingCards = universitiesGrid.querySelectorAll('.university-card');
            existingCards.forEach(card => card.remove());
            
            emptyState.style.display = 'block';
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const statusFilter = statusFilterSelect ? statusFilterSelect.value : '';
            const hasActiveFilters = searchTerm || statusFilter;
            
            if (universities.length === 0) {
                emptyState.innerHTML = `
                    <div class="empty-content">
                        <i class="fas fa-university"></i>
                        <h3>No Universities Added</h3>
                        <p>Add your first university to get started</p>
                    </div>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="empty-content">
                        <i class="fas fa-search"></i>
                        <h3>No Universities Found</h3>
                        <p>Try adjusting your search or filter criteria</p>
                        <button class="btn btn-secondary" onclick="clearSearch(); document.getElementById('filterStatus').value = ''; renderUniversities();">
                            <i class="fas fa-times"></i>
                            Clear Filters
                        </button>
                    </div>
                `;
            }
            return;
        }

        emptyState.style.display = 'none';
        
        const existingCards = universitiesGrid.querySelectorAll('.university-card');
        existingCards.forEach(card => card.remove());
        
        const universityCards = filteredUniversities.map(university => {
            const statusClass = getStatusClass(university.status);
            const deadline = university.applicationDeadline ? new Date(university.applicationDeadline) : null;
            const isDeadlineClose = deadline && isDateSoon(deadline);
            
            return `
                <div class="university-card" data-id="${university.id}" onclick="showUniversityDetails('${university.id}')">
                    <div class="university-header">
                        <h3 class="university-name">${university.name}</h3>
                        <div class="university-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${formatLocationDisplay(university.location)}
                        </div>
                        <div class="university-actions" onclick="event.stopPropagation()">
                            <button class="action-btn details" onclick="showUniversityDetailsFromCard('${university.name}', '${university.location}')" title="Show Details">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="action-btn edit" onclick="editUniversity('${university.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteUniversity('${university.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="university-body">
                        <div class="university-status">
                            <span class="status-badge ${statusClass}">${university.status || 'planning'}</span>
                            ${university.website ? `
                                <a href="${university.website}" target="_blank" class="university-website" onclick="event.stopPropagation()">
                                    <i class="fas fa-external-link-alt"></i>
                                    Visit Website
                                </a>
                            ` : ''}
                        </div>
                        
                        <div class="university-info">
                            <div class="info-item">
                                <span class="info-label">Application Fee</span>
                                <span class="info-value fee">${formatCurrency(university.applicationFee)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Deadline</span>
                                <span class="info-value deadline ${isDeadlineClose ? 'urgent' : ''}">${formatDate(deadline)}</span>
                                ${university.applicationDeadline ? generateMiniCountdown(university.applicationDeadline) : ''}
                            </div>
                            ${university.semester ? `
                                <div class="info-item">
                                    <span class="info-label">Semester</span>
                                    <span class="info-value semester">${university.semester}</span>
                                </div>
                            ` : ''}
                            ${university.admissionsEmail ? `
                                <div class="info-item">
                                    <span class="info-label">Email</span>
                                    <span class="info-value contact"><a href="mailto:${university.admissionsEmail}" onclick="event.stopPropagation()">${university.admissionsEmail}</a></span>
                                </div>
                            ` : ''}
                            ${university.admissionsPhone ? `
                                <div class="info-item">
                                    <span class="info-label">Phone</span>
                                    <span class="info-value contact"><a href="tel:${university.admissionsPhone}" onclick="event.stopPropagation()">${university.admissionsPhone}</a></span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${university.requirements ? `
                            <div class="requirements-preview">
                                <div class="requirements-title">Requirements</div>
                                <div class="requirements-text" id="req-${university.id}">
                                    ${university.requirements.substring(0, 150)}${university.requirements.length > 150 ? '...' : ''}
                                </div>
                                ${university.requirements.length > 150 ? `
                                    <button class="requirements-toggle" onclick="event.stopPropagation(); toggleRequirements('${university.id}')">
                                        Show more
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        universityCards.forEach(cardHTML => {
            const cardElement = document.createElement('div');
            cardElement.innerHTML = cardHTML;
            universitiesGrid.appendChild(cardElement.firstElementChild);
        });
    }

    function getStatusClass(status) {
        const statusMap = {
            'planning': 'planning',
            'applied': 'applied',
            'accepted': 'accepted',
            'rejected': 'rejected'
        };
        return statusMap[status] || 'planning';
    }

    function isDateSoon(date, days = 30) {
        const today = new Date();
        const timeDiff = date.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff <= days && daysDiff > 0;
    }

    function formatCurrency(amount) {
        if (!amount || amount === '' || amount === null || amount === undefined) return 'Not set';
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return 'Not set';
        if (numAmount === 0) return 'Free';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(numAmount);
    }

    function formatDate(dateString) {
        if (!dateString || dateString === '' || dateString === null || dateString === undefined) return 'Not set';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Not set';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function showLoading() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoading() {
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    function showUniversityDetails(universityId) {
        const university = universities.find(u => u.id === universityId);
        if (!university) return;

        const modal = document.getElementById('universityDetailsModal');
        
        const initialElement = document.getElementById('universityInitial');
        if (initialElement && university.name) {
            initialElement.textContent = university.name.charAt(0).toUpperCase();
        }
        
        const nameElement = document.getElementById('detailsUniversityName');
        if (nameElement && university.name) {
            nameElement.textContent = university.name;
        }
        
        const locationElement = document.getElementById('detailsUniversityLocation');
        if (locationElement) {
            locationElement.textContent = university.location || 'Location not specified';
        }
        
        const statusElement = document.getElementById('modalUniversityStatus');
        if (statusElement) {
            statusElement.textContent = university.status || 'planning';
            statusElement.className = `status-pill ${getStatusClass(university.status)}`;
        }
        
        const deadlineElement = document.getElementById('detailsApplicationDeadline');
        if (deadlineElement) {
            if (university.applicationDeadline && university.applicationDeadline.trim() !== '') {
                const date = new Date(university.applicationDeadline);
                if (!isNaN(date.getTime())) {
                    deadlineElement.textContent = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    startCountdown(university.applicationDeadline);
                } else {
                    deadlineElement.textContent = university.applicationDeadline;
                    const countdownElement = document.getElementById('deadlineCountdown');
                    if (countdownElement) countdownElement.style.display = 'none';
                }
            } else {
                deadlineElement.textContent = 'Not set';
                const countdownElement = document.getElementById('deadlineCountdown');
                if (countdownElement) countdownElement.style.display = 'none';
            }
        }
        
        const feeElement = document.getElementById('detailsApplicationFee');
        if (feeElement) {
            if (university.applicationFee !== undefined && university.applicationFee !== null && university.applicationFee !== '') {
                const fee = parseFloat(university.applicationFee);
                if (!isNaN(fee)) {
                    if (fee === 0) {
                        feeElement.textContent = 'Free';
                    } else {
                        feeElement.textContent = new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                        }).format(fee);
                    }
                } else {
                    feeElement.textContent = 'Not set';
                }
            } else {
                feeElement.textContent = 'Not set';
            }
        }
        
        const semesterElement = document.getElementById('modalUniversitySemester');
        if (semesterElement) {
            if (university.semester && university.semester.trim() !== '') {
                semesterElement.textContent = university.semester;
            } else {
                semesterElement.textContent = 'Not specified';
            }
        }
        
        const websiteElement = document.getElementById('detailsUniversityWebsite');
        if (websiteElement) {
            if (university.website && university.website.trim() !== '') {
                websiteElement.innerHTML = `<a href="${university.website}" target="_blank">${university.website}</a>`;
            } else {
                websiteElement.textContent = 'Not set';
            }
        }
        
        const requirementsElement = document.getElementById('requirementsChecklist');
        const requirementsSection = document.getElementById('requirementsSection');
        if (requirementsElement && requirementsSection) {
            if (university.requirements && university.requirements.trim() !== '') {
                const requirementsList = parseRequirements(university.requirements);
                requirementsElement.innerHTML = generateRequirementsChecklist(requirementsList, university.id);
                requirementsSection.style.display = 'block';
                
                attachChecklistListeners(university.id);
            } else {
                requirementsElement.innerHTML = '<div class="no-requirements">No requirements specified</div>';
                requirementsSection.style.display = 'block';
            }
        }
        
        const notesElement = document.getElementById('notesContent');
        const notesSection = document.getElementById('notesSection');
        if (notesElement && notesSection) {
            if (university.notes) {
                notesElement.textContent = university.notes;
                notesSection.style.display = 'block';
            } else {
                notesElement.textContent = 'No notes added';
                notesSection.style.display = 'block';
            }
        }
        
        const admissionsEmailElement = document.getElementById('detailsAdmissionsEmail');
        if (admissionsEmailElement) {
            if (university.admissionsEmail && university.admissionsEmail.trim() !== '') {
                admissionsEmailElement.innerHTML = `<a href="mailto:${university.admissionsEmail}">${university.admissionsEmail}</a>`;
            } else {
                admissionsEmailElement.textContent = 'Not provided';
            }
        }
        
        const admissionsPhoneElement = document.getElementById('detailsAdmissionsPhone');
        if (admissionsPhoneElement) {
            if (university.admissionsPhone && university.admissionsPhone.trim() !== '') {
                admissionsPhoneElement.innerHTML = `<a href="tel:${university.admissionsPhone}">${university.admissionsPhone}</a>`;
            } else {
                admissionsPhoneElement.textContent = 'Not provided';
            }
        }
        
        const contactPersonElement = document.getElementById('detailsContactPerson');
        if (contactPersonElement) {
            contactPersonElement.textContent = university.contactPerson || 'Not provided';
        }
        
        const officeHoursElement = document.getElementById('detailsOfficeHours');
        if (officeHoursElement) {
            officeHoursElement.textContent = university.officeHours || 'Not provided';
        }
        
        const editButton = document.getElementById('editUniversityBtn');
        if (editButton) {
            editButton.onclick = () => {
                modal.style.display = 'none';
                modal.classList.remove('active');
                editUniversity(universityId);
            };
        }
        
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    window.showUniversityDetails = showUniversityDetails;

    function filterUniversities() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const statusFilter = statusFilterSelect ? statusFilterSelect.value : '';
        
        const filtered = universities.filter(university => {
            const matchesSearch = !searchTerm || 
                (university.name && university.name.toLowerCase().includes(searchTerm)) ||
                (university.location && university.location.toLowerCase().includes(searchTerm));
                
            const matchesStatus = !statusFilter || statusFilter === '' || university.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });

        renderUniversities(filtered);
    }

    function clearSearch() {
        if (searchInput) searchInput.value = '';
        if (statusFilterSelect) statusFilterSelect.value = '';
        renderUniversities(universities);
    }

    window.clearSearch = clearSearch;

    window.toggleRequirements = function(id) {
        const textElement = document.getElementById(`req-${id}`);
        const button = textElement.nextElementSibling;
        const university = universities.find(u => u.id === id);
        
        if (textElement.classList.contains('expanded')) {
            textElement.classList.remove('expanded');
            textElement.innerHTML = university.requirements.substring(0, 150) + '...';
            button.textContent = 'Show more';
        } else {
            textElement.classList.add('expanded');
            textElement.innerHTML = university.requirements;
            button.textContent = 'Show less';
        }
    };

    window.editUniversity = function(id) {
        const university = universities.find(u => u.id === id);
        if (!university) return;

        editingId = id;
        modalTitle.textContent = 'Edit University';
        saveBtn.textContent = 'Update University';

        const searchSection = document.querySelector('.university-search-section');
        const formSection = document.getElementById('universityFormSection');
        
        if (searchSection && formSection) {
            searchSection.style.display = 'none';
            formSection.style.display = 'block';
        }

        hideUniversityDataPreview();
        clearFieldSources();

        document.getElementById('universityName').value = university.name || '';
        document.getElementById('universityLocation').value = university.location || '';
        document.getElementById('applicationFee').value = university.applicationFee || '';
        document.getElementById('applicationDeadline').value = university.applicationDeadline || '';
        document.getElementById('universityStatus').value = university.status || 'planning';
        document.getElementById('universitySemester').value = university.semester || '';
        document.getElementById('universityWebsite').value = university.website || '';
        document.getElementById('admissionsEmail').value = university.admissionsEmail || '';
        document.getElementById('admissionsPhone').value = university.admissionsPhone || '';
        document.getElementById('contactPerson').value = university.contactPerson || '';
        document.getElementById('officeHours').value = university.officeHours || '';
        document.getElementById('requirements').value = university.requirements || '';
        document.getElementById('notes').value = university.notes || '';

        universityModal.classList.add('active');
    };

    window.deleteUniversity = function(id) {
        deleteUniversityId = id;
        deleteModal.classList.add('active');
    };

    addUniversityBtn.addEventListener('click', () => {
        editingId = null;
        modalTitle.textContent = 'Add University';
        saveBtn.textContent = 'Save University';
        universityForm.reset();
        isUserTriggeredSave = false;
        showUniversitySearchSection();
        universityModal.classList.add('active');
    });

    function showUniversitySearchSection() {
        const searchSection = document.querySelector('.university-search-section');
        const formSection = document.getElementById('universityFormSection');
        const universitySearchInput = document.getElementById('universitySearchInput');
        
        if (searchSection && formSection) {
            searchSection.style.display = 'block';
            formSection.style.display = 'none';
            
            if (universitySearchInput) {
                universitySearchInput.value = '';
                universitySearchInput.focus();
            }
            
            hideUniversityDataPreview();
            clearFieldSources();
        }
    }

    function showUniversityFormSection() {
        const searchSection = document.querySelector('.university-search-section');
        const formSection = document.getElementById('universityFormSection');
        
        if (searchSection && formSection) {
            searchSection.style.display = 'none';
            formSection.style.display = 'block';
        }
    }

    function hideUniversityDataPreview() {
        const preview = document.getElementById('universityDataPreview');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    function showUniversityDataPreview(universityData) {
        const preview = document.getElementById('universityDataPreview');
        if (!preview) return;

        const name = universityData.name || 'Unknown University';
        const state = universityData.state || universityData['state-province'] || '';
        const country = universityData.country || 'United States';
        const website = universityData.web_pages && universityData.web_pages[0] ? universityData.web_pages[0] : '';

        let location = '';
        if (state && country === 'United States') {
            location = state;
        } else if (country) {
            location = country;
        }

        document.getElementById('previewType').textContent = 
            country === 'United States' ? 'US University' : 'International';
        
        document.getElementById('previewSize').textContent = 
            'Official Database';
        
        document.getElementById('previewAcceptance').textContent = 
            'Contact for Details';
        
        document.getElementById('previewTuitionIn').textContent = 
            'Visit Website';
        
        document.getElementById('previewTuitionOut').textContent = 
            'Visit Website';
        
        document.getElementById('previewSAT').textContent = 
            website ? 'Website Available' : 'Contact University';

        preview.style.display = 'block';
    }

    function clearFieldSources() {
        const sources = ['nameSource', 'locationSource', 'websiteSource', 'feeSource', 'deadlineSource'];
        sources.forEach(sourceId => {
            const element = document.getElementById(sourceId);
            if (element) element.style.display = 'none';
        });
    }

    function showFieldSource(sourceId) {
        const element = document.getElementById(sourceId);
        if (element) element.style.display = 'flex';
    }

    const universitySearchInput = document.getElementById('universitySearchInput');
    const searchResults = document.getElementById('searchResults');
    const searchLoading = document.getElementById('searchLoading');
    const searchStats = document.getElementById('searchStats');
    const skipSearchBtn = document.getElementById('skipSearchBtn');

    if (universitySearchInput) {
        let isSearching = false;
        
        universitySearchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
            
            if (query.length === 0) {
                hideSearchResults();
                hideSearchLoading();
                return;
            }
            
            if (query.length < 2) {
                hideSearchResults();
                if (searchStats) {
                    searchStats.style.display = 'none';
                }
                return;
            }
            
            showSearchLoading();
            
            searchDebounceTimer = setTimeout(() => {
                if (!isSearching) {
                    performUniversitySearch(query);
                }
            }, 400);
        });

        universitySearchInput.addEventListener('focus', function() {
            const query = this.value.trim();
            if (query.length >= 2 && searchResults) {
                const resultsList = document.getElementById('searchResultsList');
                if (resultsList && resultsList.children.length > 0) {
                    searchResults.style.display = 'block';
                }
            }
        });

        universitySearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length >= 2 && !isSearching) {
                    if (searchDebounceTimer) {
                        clearTimeout(searchDebounceTimer);
                    }
                    performUniversitySearch(query);
                }
            }
            
            if (e.key === 'Escape') {
                hideSearchResults();
                this.blur();
            }
        });
    }

    if (skipSearchBtn) {
        skipSearchBtn.addEventListener('click', function() {
            selectedUniversityData = null;
            clearFieldSources();
            hideUniversityDataPreview();
            showUniversityFormSection();
        });
    }

    document.addEventListener('click', function(e) {
        if (searchResults && !searchResults.contains(e.target) && 
            universitySearchInput && !universitySearchInput.contains(e.target)) {
            hideSearchResults();
        }
    });

    // Use the global searchUniversities function
    async function performUniversitySearch(query) {
        const universitySearchInput = document.getElementById('universitySearchInput');
        let isSearching = true;
        
        // Store the query for retry functionality
        lastSearchQuery = query;
        
        showSearchLoading();
        
        if (searchStats) {
            searchStats.style.display = 'none';
        }

        try {
            if (currentSearchRequest) {
                currentSearchRequest.abort();
            }
            
            const universities = await searchUniversities(query);
            
            if (universitySearchInput && universitySearchInput.value.trim() !== query) {
                return;
            }
            
            if (universities && universities.length > 0) {
                displaySearchResults(universities, query);
                if (searchStats) {
                    searchStats.style.display = 'block';
                }
            } else {
                showNoResults(query);
            }
            
        } catch (error) {
            console.error('Error searching universities:', error);
            
            if (error.name === 'AbortError') {
                return;
            }
            
            if (error.message.includes('Unable to search')) {
                showSearchError('Search service temporarily unavailable. Please try manual entry or try again later.');
            } else if (error.message.includes('Failed to fetch')) {
                showSearchError('Network error. Please check your connection and try again.');
            } else {
                showSearchError('Search failed. Please try manual entry or try again.');
            }
        } finally {
            hideSearchLoading();
            isSearching = false;
        }
    }

    function selectUniversityFromAPI(universityData) {
        // This function is deprecated - use selectUniversityForEdit instead
        console.warn('selectUniversityFromAPI is deprecated');
        return;
    }

    function populateFormWithUniversityData(universityData) {
        const nameField = document.getElementById('universityName');
        if (nameField && universityData.name) {
            nameField.value = universityData.name;
        }

        const locationField = document.getElementById('universityLocation');
        if (locationField) {
            const state = universityData.state || universityData['state-province'] || '';
            const city = universityData.city || '';
            const country = universityData.country || '';
            let location = '';
            
            if (city && state) {
                location = `${city}, ${state}`;
            } else if (state) {
                location = state;
            } else if (country && country !== 'United States') {
                location = country;
            }
            
            locationField.value = location;
        }

        const websiteField = document.getElementById('universityWebsite');
        if (websiteField && universityData.web_pages && universityData.web_pages[0]) {
            websiteField.value = universityData.web_pages[0];
        }

        const emailField = document.getElementById('admissionsEmail');
        if (emailField && universityData.admissions_email) {
            emailField.value = universityData.admissions_email;
        }

        const phoneField = document.getElementById('admissionsPhone');
        if (phoneField && universityData.phone) {
            phoneField.value = universityData.phone;
        }

        const feeField = document.getElementById('applicationFee');
        if (feeField) {
            feeField.value = '';
            showFieldSuggestion('feeSource');
        }

        showFieldSuggestion('deadlineSource');
    }

    function showFieldSuggestion(sourceId) {
        const element = document.getElementById(sourceId);
        if (element) element.style.display = 'flex';
    }

    function showSearchLoading() {
        if (searchLoading) {
            searchLoading.style.display = 'block';
        }
    }

    function hideSearchLoading() {
        if (searchLoading) {
            searchLoading.style.display = 'none';
        }
    }

    function hideSearchResults() {
        if (searchResults) {
            searchResults.style.display = 'none';
        }
        if (searchStats) {
            searchStats.style.display = 'none';
        }
    }

    function getOwnershipType(ownership) {
        const types = {
            1: 'Public',
            2: 'Private Non-Profit',
            3: 'Private For-Profit'
        };
        return types[ownership] || 'Unknown';
    }

    function formatStudentSize(size) {
        if (!size || size === null) return null;
        
        if (size >= 1000) {
            return (size / 1000).toFixed(1) + 'K';
        }
        return size.toString();
    }

    function formatPercentage(rate) {
        if (!rate || rate === null) return null;
        return Math.round(rate * 100) + '%';
    }

    function formatSATScore(satScores) {
        if (!satScores || !satScores.average || !satScores.average.overall) return null;
        return satScores.average.overall.toString();
    }

    [closeModal, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            universityModal.classList.remove('active');
            selectedUniversityData = null;
            isUserTriggeredSave = false;
            clearFieldSources();
            hideUniversityDataPreview();
        });
    });

    [closeDeleteModal, cancelDeleteBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            deleteModal.classList.remove('active');
        });
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteUniversityId) return;

        try {
            await db.collection('users').doc(currentUser.uid).collection('universities').doc(deleteUniversityId).delete();
            
            universities = universities.filter(u => u.id !== deleteUniversityId);
            renderUniversities(filterUniversities());
            
            deleteModal.classList.remove('active');
            showNotification('University deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting university:', error);
            showNotification('Error deleting university', 'error');
        }
    });

    // Add click handler to save button to mark user-triggered saves
    saveBtn.addEventListener('click', (e) => {
        console.log('Save button clicked by user');
        isUserTriggeredSave = true;
    });

    function formatWebsiteURL(url) {
        if (!url || url.trim() === '') {
            return '';
        }
        
        url = url.trim();
        
        // If it already starts with http:// or https://, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // If it starts with www. or doesn't have a protocol, add https://
        if (url.startsWith('www.') || (!url.includes('://') && url.includes('.'))) {
            return 'https://' + url;
        }
        
        return url;
    }

    // Function to show university details from card using API search
    window.showUniversityDetailsFromCard = async function(universityName, universityLocation) {
        try {
            const modal = document.getElementById('universityInfoModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('active');
            }
            
            const addButton = document.getElementById('addFromInfoBtn');
            if (addButton) {
                addButton.style.display = 'none';
            }
            
            document.getElementById('infoUniversityName').textContent = universityName;
            document.getElementById('infoUniversityLocation').textContent = universityLocation || 'Location not available';
            
            const searchResults = await searchUniversities(universityName);
            
            if (searchResults.length > 0) {
                let bestMatch = searchResults.find(uni => 
                    uni.name && uni.name.toLowerCase() === universityName.toLowerCase()
                ) || searchResults[0];
                
                window.showUniversityInfoModal(bestMatch);
            } else {
                showNotification('No detailed information found for this university', 'warning');
            }
        } catch (error) {
            console.error('Error fetching university details:', error);
            showNotification('Failed to load university details', 'error');
        }
    };

    universityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Only allow submission if user explicitly clicked save
        if (!isUserTriggeredSave) {
            console.log('Form submission blocked - not user triggered');
            return;
        }
        
        console.log('Form submission allowed - user clicked save button');
        console.log('Form submission triggered - editingId:', editingId);
        console.log('selectedUniversityData:', selectedUniversityData);
        
        // Reset the flag
        isUserTriggeredSave = false;

        const saveButton = document.getElementById('saveBtn');
        const btnText = saveButton.querySelector('.btn-text');
        const btnSpinner = saveButton.querySelector('.btn-spinner');
        
        if (btnText && btnSpinner) {
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
        }
        saveButton.disabled = true;

        const requirementsInput = document.getElementById('requirements');
        const autoNumberedRequirements = autoNumberRequirements(requirementsInput.value);
        
        const formData = {
            name: document.getElementById('universityName').value,
            location: document.getElementById('universityLocation').value,
            applicationFee: parseFloat(document.getElementById('applicationFee').value) || 0,
            applicationDeadline: document.getElementById('applicationDeadline').value,
            status: document.getElementById('universityStatus').value,
            semester: document.getElementById('universitySemester').value,
            website: formatWebsiteURL(document.getElementById('universityWebsite').value),
            admissionsEmail: document.getElementById('admissionsEmail').value,
            admissionsPhone: document.getElementById('admissionsPhone').value,
            contactPerson: document.getElementById('contactPerson').value,
            officeHours: document.getElementById('officeHours').value,
            requirements: autoNumberedRequirements,
            notes: document.getElementById('notes').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (selectedUniversityData) {
            formData.universitySearchData = selectedUniversityData;
        }

        if (!editingId) {
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        try {
            if (editingId) {
                await db.collection('users').doc(currentUser.uid).collection('universities').doc(editingId).update(formData);
                
                const index = universities.findIndex(u => u.id === editingId);
                if (index !== -1) {
                    universities[index] = { ...universities[index], ...formData };
                }
                
                showNotification('University updated successfully', 'success');
            } else {
                const docRef = await db.collection('users').doc(currentUser.uid).collection('universities').add(formData);
                universities.push({ id: docRef.id, ...formData });
                showNotification('University added successfully', 'success');
            }

            renderUniversities(filterUniversities());
            universityModal.classList.remove('active');
            universityForm.reset();
            selectedUniversityData = null;
        } catch (error) {
            console.error('Error saving university:', error);
            showNotification('Error saving university', 'error');
        } finally {
            if (btnText && btnSpinner) {
                btnText.style.display = 'block';
                btnSpinner.style.display = 'none';
            }
            saveButton.disabled = false;
        }
    });

    searchInput?.addEventListener('input', function() {
        const clearBtn = document.getElementById('clearSearch');
        if (clearBtn) {
            clearBtn.style.display = this.value ? 'block' : 'none';
        }
        filterUniversities();
    });

    // Add website URL formatting feedback
    const websiteInput = document.getElementById('universityWebsite');
    if (websiteInput) {
        websiteInput.addEventListener('blur', function() {
            const formattedURL = formatWebsiteURL(this.value);
            if (formattedURL !== this.value && formattedURL !== '') {
                this.value = formattedURL;
                // Show a brief notification that the URL was formatted
                const websiteSource = document.getElementById('websiteSource');
                if (websiteSource) {
                    websiteSource.style.display = 'block';
                    websiteSource.innerHTML = '<i class="fas fa-check-circle"></i><span>URL automatically formatted</span>';
                    setTimeout(() => {
                        websiteSource.style.display = 'none';
                    }, 3000);
                }
            }
        });
    }

    statusFilterSelect?.addEventListener('change', filterUniversities);

    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('universityDetailsModal');
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }
    });

    const closeDetailsModalBtn = document.getElementById('closeDetailsModal');
    if (closeDetailsModalBtn) {
        closeDetailsModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('universityDetailsModal');
            modal.style.display = 'none';
            modal.classList.remove('active');
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        });
    }

    function showNotification(message, type = 'info') {
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function parseRequirements(requirementsText) {
        const lines = requirementsText.split('\n');
        const requirements = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                if (/^\d+\./.test(trimmed)) {
                    const requirement = trimmed.replace(/^\d+\.\s*/, '');
                    if (requirement) {
                        requirements.push(requirement);
                    }
                } else {
                    requirements.push(trimmed);
                }
            }
        });
        
        return requirements;
    }

    function autoNumberRequirements(requirementsText) {
        if (!requirementsText || requirementsText.trim() === '') {
            return '';
        }

        const lines = requirementsText.split('\n');
        const numberedLines = [];
        let counter = 1;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                if (/^\d+\./.test(trimmed)) {
                    numberedLines.push(trimmed);
                } else {
                    numberedLines.push(`${counter}. ${trimmed}`);
                    counter++;
                }
            }
        });

        return numberedLines.join('\n');
    }

    function calculateTimeRemaining(deadlineDate) {
        const now = new Date().getTime();
        const deadline = new Date(deadlineDate).getTime();
        const difference = deadline - now;

        if (difference <= 0) {
            return {
                expired: true,
                months: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0
            };
        }

        const months = Math.floor(difference / (1000 * 60 * 60 * 24 * 30));
        const days = Math.floor((difference % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return {
            expired: false,
            months,
            days,
            hours,
            minutes,
            seconds,
            totalDays: Math.floor(difference / (1000 * 60 * 60 * 24))
        };
    }

    function updateCountdownDisplay(deadlineDate) {
        const timeRemaining = calculateTimeRemaining(deadlineDate);
        const countdownElement = document.getElementById('deadlineCountdown');
        
        if (!countdownElement) return;

        document.getElementById('countdownMonths').textContent = timeRemaining.months;
        document.getElementById('countdownDays').textContent = timeRemaining.days;
        document.getElementById('countdownHours').textContent = timeRemaining.hours;
        document.getElementById('countdownMinutes').textContent = timeRemaining.minutes;
        document.getElementById('countdownSeconds').textContent = timeRemaining.seconds;

        countdownElement.className = 'countdown-timer';
        
        if (timeRemaining.expired) {
            countdownElement.classList.add('expired');
        } else if (timeRemaining.totalDays <= 7) {
            countdownElement.classList.add('urgent');
        }

        countdownElement.style.display = 'flex';
    }

    function startCountdown(deadlineDate) {
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }

        if (!deadlineDate) return;

        updateCountdownDisplay(deadlineDate);
        
        countdownInterval = setInterval(() => {
            updateCountdownDisplay(deadlineDate);
        }, 1000);
    }

    function generateMiniCountdown(deadlineDate) {
        if (!deadlineDate) return '';
        
        const timeRemaining = calculateTimeRemaining(deadlineDate);
        
        if (timeRemaining.expired) {
            return '<div class="mini-countdown"><i class="fas fa-exclamation-triangle"></i>Deadline passed</div>';
        }
        
        let countdownClass = 'safe';
        if (timeRemaining.totalDays <= 3) {
            countdownClass = 'urgent';
        } else if (timeRemaining.totalDays <= 14) {
            countdownClass = 'warning';
        }
        
        if (timeRemaining.totalDays > 30) {
            return `<div class="mini-countdown ${countdownClass}"><i class="fas fa-clock"></i>${timeRemaining.months}m ${timeRemaining.days}d left</div>`;
        } else {
            return `<div class="mini-countdown ${countdownClass}"><i class="fas fa-clock"></i>${timeRemaining.totalDays}d ${timeRemaining.hours}h left</div>`;
        }
    }

    function calculateStatistics() {
        const stats = {
            total: universities.length,
            planning: 0,
            applied: 0,
            accepted: 0,
            rejected: 0,
            upcomingDeadlines: 0,
            totalFees: 0
        };

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        universities.forEach(university => {
            const status = university.status || 'planning';
            stats[status]++;

            if (university.applicationDeadline) {
                const deadline = new Date(university.applicationDeadline);
                if (deadline > now && deadline <= thirtyDaysFromNow) {
                    stats.upcomingDeadlines++;
                }
            }

            if (university.applicationFee) {
                const fee = parseFloat(university.applicationFee) || 0;
                stats.totalFees += fee;
            }
        });

        return stats;
    }

    function updateStatistics() {
        const stats = calculateStatistics();

        document.getElementById('totalUniversities').textContent = stats.total;
        document.getElementById('planningCount').textContent = stats.planning;
        document.getElementById('appliedCount').textContent = stats.applied;
        document.getElementById('acceptedCount').textContent = stats.accepted;
        document.getElementById('upcomingDeadlines').textContent = stats.upcomingDeadlines;
        
        const totalFeesElement = document.getElementById('totalFees');
        if (totalFeesElement) {
            totalFeesElement.textContent = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(stats.totalFees);
        }
    }

    function generateRequirementsChecklist(requirements, universityId) {
        if (requirements.length === 0) {
            return '<div class="no-requirements">No requirements specified</div>';
        }

        const university = universities.find(u => u.id === universityId);
        const completedRequirements = university?.completedRequirements || [];

        return `
            <div class="checklist-container">
                ${requirements.map((req, index) => `
                    <div class="checklist-item">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" 
                                   class="requirement-checkbox" 
                                   data-university-id="${universityId}"
                                   data-requirement-index="${index}"
                                   ${completedRequirements.includes(index) ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            <span class="requirement-text">${req}</span>
                        </label>
                    </div>
                `).join('')}
                <div class="checklist-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(completedRequirements.length / requirements.length) * 100}%"></div>
                    </div>
                    <span class="progress-text">${completedRequirements.length} of ${requirements.length} completed</span>
                </div>
            </div>
        `;
    }

    function attachChecklistListeners(universityId) {
        const checkboxes = document.querySelectorAll(`input[data-university-id="${universityId}"]`);
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateRequirementProgress(universityId, parseInt(this.dataset.requirementIndex), this.checked);
            });
        });
    }

    async function updateRequirementProgress(universityId, requirementIndex, isCompleted) {
        try {
            const university = universities.find(u => u.id === universityId);
            if (!university) return;

            let completedRequirements = university.completedRequirements || [];

            if (isCompleted) {
                if (!completedRequirements.includes(requirementIndex)) {
                    completedRequirements.push(requirementIndex);
                }
            } else {
                completedRequirements = completedRequirements.filter(index => index !== requirementIndex);
            }

            await db.collection('users').doc(currentUser.uid).collection('universities').doc(universityId).update({
                completedRequirements: completedRequirements,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            university.completedRequirements = completedRequirements;

            const progressBar = document.querySelector('.progress-fill');
            const progressText = document.querySelector('.progress-text');
            const totalRequirements = parseRequirements(university.requirements).length;

            if (progressBar && progressText) {
                const progressPercentage = (completedRequirements.length / totalRequirements) * 100;
                progressBar.style.width = `${progressPercentage}%`;
                progressText.textContent = `${completedRequirements.length} of ${totalRequirements} completed`;
            }

        } catch (error) {
            console.error('Error updating requirement progress:', error);
            showNotification('Error updating requirement progress', 'error');
        }
    }

    async function loadUniversities() {
        try {
            showLoading();
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('universities')
                .orderBy('createdAt', 'asc').get();
            
            universities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderUniversities();
        } catch (error) {
            console.error('Error loading universities:', error);
            showNotification('Error loading universities', 'error');
        }
    }

    loadUniversities();

    document.addEventListener('click', (e) => {
        if (e.target === universityModal) {
            universityModal.classList.remove('active');
            selectedUniversityData = null;
            clearFieldSources();
            hideUniversityDataPreview();
        }
        if (e.target === deleteModal) {
            deleteModal.classList.remove('active');
        }
    });





    function renderUniversities(filteredUniversities = universities) {
        hideLoading();
        updateStatistics();
        
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
        
        if (filteredUniversities.length === 0) {
            const existingCards = universitiesGrid.querySelectorAll('.university-card');
            existingCards.forEach(card => card.remove());
            
            emptyState.style.display = 'block';
            
            const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
            const statusFilter = statusFilterSelect ? statusFilterSelect.value : '';
            const hasActiveFilters = searchTerm || statusFilter;
            
            if (universities.length === 0) {
                emptyState.innerHTML = `
                    <div class="empty-content">
                        <i class="fas fa-university"></i>
                        <h3>No Universities Added</h3>
                        <p>Add your first university to get started</p>
                    </div>
                `;
            } else {
                emptyState.innerHTML = `
                    <div class="empty-content">
                        <i class="fas fa-search"></i>
                        <h3>No Universities Found</h3>
                        <p>Try adjusting your search or filter criteria</p>
                        <button class="btn btn-secondary" onclick="clearSearch(); document.getElementById('filterStatus').value = ''; renderUniversities();">
                            <i class="fas fa-times"></i>
                            Clear Filters
                        </button>
                    </div>
                `;
            }
            return;
        }

        emptyState.style.display = 'none';
        
        const existingCards = universitiesGrid.querySelectorAll('.university-card');
        existingCards.forEach(card => card.remove());
        
        const universityCards = filteredUniversities.map(university => {
            const statusClass = getStatusClass(university.status);
            const deadline = university.applicationDeadline ? new Date(university.applicationDeadline) : null;
            const isDeadlineClose = deadline && isDateSoon(deadline);
            
            return `
                <div class="university-card" data-id="${university.id}" onclick="showUniversityDetails('${university.id}')">
                    <div class="university-header">
                        <h3 class="university-name">${university.name}</h3>
                        <div class="university-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${formatLocationDisplay(university.location)}
                        </div>
                        <div class="university-actions" onclick="event.stopPropagation()">
                            <button class="action-btn details" onclick="showUniversityDetailsFromCard('${university.name}', '${university.location}')" title="Show Details">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="action-btn edit" onclick="editUniversity('${university.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="deleteUniversity('${university.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="university-body">
                        <div class="university-status">
                            <span class="status-badge ${statusClass}">${university.status || 'planning'}</span>
                            ${university.website ? `
                                <a href="${university.website}" target="_blank" class="university-website" onclick="event.stopPropagation()">
                                    <i class="fas fa-external-link-alt"></i>
                                    Visit Website
                                </a>
                            ` : ''}
                        </div>
                        
                        <div class="university-info">
                            <div class="info-item">
                                <span class="info-label">Application Fee</span>
                                <span class="info-value fee">${formatCurrency(university.applicationFee)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Deadline</span>
                                <span class="info-value deadline ${isDeadlineClose ? 'urgent' : ''}">${formatDate(deadline)}</span>
                                ${university.applicationDeadline ? generateMiniCountdown(university.applicationDeadline) : ''}
                            </div>
                            ${university.semester ? `
                                <div class="info-item">
                                    <span class="info-label">Semester</span>
                                    <span class="info-value semester">${university.semester}</span>
                                </div>
                            ` : ''}
                            ${university.admissionsEmail ? `
                                <div class="info-item">
                                    <span class="info-label">Email</span>
                                    <span class="info-value contact"><a href="mailto:${university.admissionsEmail}" onclick="event.stopPropagation()">${university.admissionsEmail}</a></span>
                                </div>
                            ` : ''}
                            ${university.admissionsPhone ? `
                                <div class="info-item">
                                    <span class="info-label">Phone</span>
                                    <span class="info-value contact"><a href="tel:${university.admissionsPhone}" onclick="event.stopPropagation()">${university.admissionsPhone}</a></span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${university.requirements ? `
                            <div class="requirements-preview">
                                <div class="requirements-title">Requirements</div>
                                <div class="requirements-text" id="req-${university.id}">
                                    ${university.requirements.substring(0, 150)}${university.requirements.length > 150 ? '...' : ''}
                                </div>
                                ${university.requirements.length > 150 ? `
                                    <button class="requirements-toggle" onclick="event.stopPropagation(); toggleRequirements('${university.id}')">
                                        Show more
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        universityCards.forEach(cardHTML => {
            const cardElement = document.createElement('div');
            cardElement.innerHTML = cardHTML;
            universitiesGrid.appendChild(cardElement.firstElementChild);
        });
    }

    // Initialize search functionality
    fixSearchResultsDisplay();
});























// Add event listener for search results fix
function fixSearchResultsDisplay() {
    const searchResults = document.getElementById('searchResults');
    const searchResultsList = document.getElementById('searchResultsList');
    
    if (!searchResults || !searchResultsList) return;
    
    // Make sure search results are visible when they have content
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && searchResultsList.children.length > 0) {
                searchResults.style.display = 'block';
                searchResults.style.visibility = 'visible';
                searchResults.style.opacity = '1';
                searchResults.style.maxHeight = 'none';
                
                // Make sure the parent container is also visible
                const searchSection = searchResults.closest('.university-search-section');
                if (searchSection) {
                    searchSection.style.display = 'block';
                }
            } else if (mutation.type === 'childList' && searchResultsList.children.length === 0) {
                searchResults.style.display = 'none';
            }
        });
    });
    
    observer.observe(searchResultsList, { childList: true, subtree: true });
    
    // Also fix the search results visibility immediately if they have content
    if (searchResultsList.children.length > 0) {
        searchResults.style.display = 'block';
        searchResults.style.visibility = 'visible';
        searchResults.style.opacity = '1';
    }
}

window.showUniversityInfoModal = function(university) {
    const modal = document.getElementById('universityInfoModal');
    
    document.getElementById('infoUniversityName').textContent = university.name || 'Unknown University';
    document.getElementById('infoUniversityLocation').textContent = 
        university.city && university.state ? `${university.city}, ${university.state} ${university.zip || ''}` : 
        university.state || university.city || 'Location not available';
    
    const websiteElement = document.getElementById('infoWebsite');
    if (university.web_pages && university.web_pages[0]) {
        websiteElement.innerHTML = `<a href="${university.web_pages[0]}" target="_blank">${university.web_pages[0]}</a>`;
    } else {
        websiteElement.textContent = 'Not available';
    }
    
    document.getElementById('infoZipCode').textContent = university.zip || 'Not available';
    document.getElementById('infoOwnership').textContent = university.ownership || 'Not specified';
    document.getElementById('infoMainCampus').textContent = university.main_campus ? 'Yes' : 'No';
    document.getElementById('infoReligiousAffiliation').textContent = university.religious_affiliation || 'Not specified';
    
    const minorityServing = [];
    if (university.historically_black) minorityServing.push('Historically Black');
    if (university.predominantly_black) minorityServing.push('Predominantly Black');
    if (university.hispanic_serving) minorityServing.push('Hispanic Serving');
    if (university.tribal) minorityServing.push('Tribal');
    if (university.asian_serving) minorityServing.push('Asian/Pacific Islander Serving');
    if (university.native_american_serving) minorityServing.push('Native American Serving');
    document.getElementById('infoMinorityServing').textContent = minorityServing.length > 0 ? minorityServing.join(', ') : 'None';
    
    document.getElementById('infoCarnegieBasic').textContent = 
        university.carnegie_basic ? getCarnegieDescription(university.carnegie_basic) : 'Not available';
    
    document.getElementById('infoDegreesAwarded').textContent = 
        university.degrees_awarded_predominant ? getDegreesAwardedDescription(university.degrees_awarded_predominant) : 'Not available';
    
    document.getElementById('infoHighestDegree').textContent = 
        university.degrees_awarded_highest ? getHighestDegreeDescription(university.degrees_awarded_highest) : 'Not available';
    
    document.getElementById('infoUndergraduateProgram').textContent = 
        university.undergraduate_offering ? getUndergraduateOfferingDescription(university.undergraduate_offering) : 'Not available';
    
    document.getElementById('infoAdmissionRate').textContent = 
        university.admission_rate ? `${(university.admission_rate * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoSatAverage').textContent = 
        university.sat_average ? university.sat_average.toString() : 'Not available';
    
    document.getElementById('infoSatReading25').textContent = 
        university.sat_reading_25th ? university.sat_reading_25th.toString() : 'Not available';
    
    document.getElementById('infoSatReading75').textContent = 
        university.sat_reading_75th ? university.sat_reading_75th.toString() : 'Not available';
    
    document.getElementById('infoSatMath25').textContent = 
        university.sat_math_25th ? university.sat_math_25th.toString() : 'Not available';
    
    document.getElementById('infoSatMath75').textContent = 
        university.sat_math_75th ? university.sat_math_75th.toString() : 'Not available';
    
    document.getElementById('infoActCumulative25').textContent = 
        university.act_cumulative_25th ? university.act_cumulative_25th.toString() : 'Not available';
    
    document.getElementById('infoActCumulative75').textContent = 
        university.act_cumulative_75th ? university.act_cumulative_75th.toString() : 'Not available';
    
    document.getElementById('infoTuitionInState').textContent = 
        university.tuition_in_state ? `$${university.tuition_in_state.toLocaleString()}` : 'Not available';
    
    document.getElementById('infoTuitionOutState').textContent = 
        university.tuition_out_state ? `$${university.tuition_out_state.toLocaleString()}` : 'Not available';
    
    document.getElementById('infoAverageNetPrice').textContent = 
        university.avg_net_price ? `$${university.avg_net_price.toLocaleString()}` : 'Not available';
    
    document.getElementById('infoAverageFinancialAid').textContent = 
        university.federal_loan_rate ? `${(university.federal_loan_rate * 100).toFixed(1)}% receive federal loans` : 'Not available';
    
    document.getElementById('infoMedianDebt').textContent = 
        university.median_debt ? `$${university.median_debt.toLocaleString()}` : 'Not available';
    
    const priceCalculatorElement = document.getElementById('infoPriceCalculator');
    if (university.price_calculator_url) {
        priceCalculatorElement.innerHTML = `<a href="${university.price_calculator_url}" target="_blank">Available</a>`;
    } else {
        priceCalculatorElement.textContent = 'Not available';
    }
    
    document.getElementById('infoTotalEnrollment').textContent = 
        university.student_size ? university.student_size.toLocaleString() : 'Not available';
    
    document.getElementById('infoUndergraduateEnrollment').textContent = 
        university.undergraduate_enrollment ? university.undergraduate_enrollment.toLocaleString() : 'Not available';
    
    document.getElementById('infoStudentSize').textContent = 
        university.student_size ? getStudentSizeCategory(university.student_size) : 'Not available';
    
    document.getElementById('infoPartTimeShare').textContent = 
        university.part_time_share ? `${(university.part_time_share * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoFemaleShare').textContent = 
        university.female_share ? `${(university.female_share * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoAgeEntry').textContent = 
        university.age_entry ? `${university.age_entry.toFixed(1)} years` : 'Not available';
    
    document.getElementById('infoWhiteShare').textContent = 
        university.white_share ? `${(university.white_share * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoBlackShare').textContent = 
        university.black_share ? `${(university.black_share * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoHispanicShare').textContent = 
        university.hispanic_share ? `${(university.hispanic_share * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoAsianShare').textContent = 
        university.asian_share ? `${(university.asian_share * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoFirstGeneration').textContent = 
        university.first_generation ? `${(university.first_generation * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoPellGrant').textContent = 
        university.pell_grant_rate ? `${(university.pell_grant_rate * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoCompletionRateOverall').textContent = 
        university.completion_rate_overall ? `${(university.completion_rate_overall * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoCompletionRate4Year').textContent = 
        university.completion_rate_4yr ? `${(university.completion_rate_4yr * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoRetentionRate').textContent = 
        university.retention_rate ? `${(university.retention_rate * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoTransferRate').textContent = 
        university.transfer_rate ? `${(university.transfer_rate * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoMedianEarnings6').textContent = 
        university.median_earnings_6yr ? `$${university.median_earnings_6yr.toLocaleString()}` : 'Not available';
    
    document.getElementById('infoMedianEarnings10').textContent = 
        university.median_earnings_10yr ? `$${university.median_earnings_10yr.toLocaleString()}` : 'Not available';
    
    document.getElementById('infoEmploymentRate').textContent = 
        university.employment_rate ? `${(university.employment_rate * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoRepaymentRate').textContent = 
        university.repayment_rate ? `${(university.repayment_rate * 100).toFixed(1)}%` : 'Not available';
    
    document.getElementById('infoCoordinates').textContent = 
        university.latitude && university.longitude ? 
        `${university.latitude.toFixed(4)}, ${university.longitude.toFixed(4)}` : 'Not available';
    
    document.getElementById('infoLocale').textContent = 
        university.locale ? getLocaleDescription(university.locale) : 'Not available';
    
    const emailElement = document.getElementById('infoAdmissionsEmail');
    if (university.admissions_email) {
        emailElement.innerHTML = `<a href="mailto:${university.admissions_email}">${university.admissions_email}</a>`;
    } else {
        emailElement.textContent = 'Not generated';
    }
    
    document.getElementById('addFromInfoBtn').onclick = function() {
        modal.style.display = 'none';
        modal.classList.remove('active');
        selectUniversityForEdit(
            university.name,
            university.city && university.state ? `${university.city}, ${university.state}` : university.state || university.city,
            university.web_pages && university.web_pages[0] ? university.web_pages[0] : '',
            university.admissions_email || '',
            ''
        );
    };
    
    modal.style.display = 'flex';
    modal.classList.add('active');
};

function getCarnegieDescription(code) {
    const carnegieMap = {
        15: 'Doctoral Universities: Very High Research Activity',
        16: 'Doctoral Universities: High Research Activity',
        17: 'Doctoral/Professional Universities',
        18: 'Master\'s Colleges & Universities: Larger Programs',
        19: 'Master\'s Colleges & Universities: Medium Programs',
        20: 'Master\'s Colleges & Universities: Small Programs',
        21: 'Baccalaureate Colleges: Arts & Sciences Focus',
        22: 'Baccalaureate Colleges: Diverse Fields',
        23: 'Baccalaureate/Associate\'s Colleges: Mixed Baccalaureate/Associate\'s',
        24: 'Associate\'s Colleges: High Transfer-High Traditional',
        25: 'Associate\'s Colleges: High Transfer-Mixed Traditional/Nontraditional',
        26: 'Associate\'s Colleges: High Transfer-High Nontraditional',
        27: 'Associate\'s Colleges: Mixed Transfer/Career & Technical-High Traditional',
        28: 'Associate\'s Colleges: Mixed Transfer/Career & Technical-Mixed Traditional/Nontraditional',
        29: 'Associate\'s Colleges: Mixed Transfer/Career & Technical-High Nontraditional',
        30: 'Associate\'s Colleges: High Career & Technical-High Traditional',
        31: 'Associate\'s Colleges: High Career & Technical-Mixed Traditional/Nontraditional',
        32: 'Associate\'s Colleges: High Career & Technical-High Nontraditional',
        33: 'Special Focus Two-Year: Health Professions',
        34: 'Special Focus Two-Year: Technical Professions',
        35: 'Special Focus Two-Year: Arts & Design',
        36: 'Special Focus Two-Year: Other Fields',
        37: 'Special Focus Four-Year: Faith-Related Institutions',
        38: 'Special Focus Four-Year: Medical Schools & Medical Centers',
        39: 'Special Focus Four-Year: Other Health Professions Schools',
        40: 'Special Focus Four-Year: Engineering Schools',
        41: 'Special Focus Four-Year: Other Technology-Related Schools',
        42: 'Special Focus Four-Year: Business & Management Schools',
        43: 'Special Focus Four-Year: Arts, Music & Design Schools',
        44: 'Special Focus Four-Year: Law Schools',
        45: 'Special Focus Four-Year: Other Special Focus Institutions',
        46: 'Tribal Colleges'
    };
    return carnegieMap[code] || `Carnegie Code: ${code}`;
}

function getLocaleDescription(code) {
    const localeMap = {
        11: 'City: Large',
        12: 'City: Midsize',
        13: 'City: Small',
        21: 'Suburb: Large',
        22: 'Suburb: Midsize',
        23: 'Suburb: Small',
        31: 'Town: Fringe',
        32: 'Town: Distant',
        33: 'Town: Remote',
        41: 'Rural: Fringe',
        42: 'Rural: Distant',
        43: 'Rural: Remote'
    };
    return localeMap[code] || `Locale Code: ${code}`;
}

function getDegreesAwardedDescription(code) {
    const degreesMap = {
        0: 'Not classified',
        1: 'Predominantly certificates',
        2: 'Predominantly associates degrees',
        3: 'Predominantly bachelors degrees',
        4: 'Graduate degrees'
    };
    return degreesMap[code] || `Degrees Code: ${code}`;
}

function getHighestDegreeDescription(code) {
    const highestMap = {
        0: 'Non-degree granting',
        1: 'Certificate degree',
        2: 'Associates degree',
        3: 'Bachelors degree',
        4: 'Graduate degree'
    };
    return highestMap[code] || `Highest Degree Code: ${code}`;
}

function getUndergraduateOfferingDescription(code) {
    const offeringMap = {
        1: 'Undergraduate program offered',
        2: 'Graduate program only',
        3: 'Undergraduate and graduate programs'
    };
    return offeringMap[code] || `Offering Code: ${code}`;
}

function getStudentSizeCategory(size) {
    if (size < 1000) return 'Very Small (Under 1,000)';
    if (size < 3000) return 'Small (1,000-2,999)';
    if (size < 10000) return 'Medium (3,000-9,999)';
    if (size < 20000) return 'Large (10,000-19,999)';
    return 'Very Large (20,000+)';
}

document.addEventListener('DOMContentLoaded', function() {
    const closeInfoModal = document.getElementById('closeInfoModal');
    const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
    const universityInfoModal = document.getElementById('universityInfoModal');

    if (closeInfoModal) {
        closeInfoModal.addEventListener('click', function() {
            universityInfoModal.style.display = 'none';
            universityInfoModal.classList.remove('active');
        });
    }

    if (closeInfoModalBtn) {
        closeInfoModalBtn.addEventListener('click', function() {
            universityInfoModal.style.display = 'none';
            universityInfoModal.classList.remove('active');
        });
    }

    if (universityInfoModal) {
        universityInfoModal.addEventListener('click', function(e) {
            if (e.target === universityInfoModal) {
                universityInfoModal.style.display = 'none';
                universityInfoModal.classList.remove('active');
            }
        });
    }
});
