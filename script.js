document.addEventListener("DOMContentLoaded", function () {
    console.log("Portfolio Loaded!");
});


document.addEventListener('DOMContentLoaded', function() {
    // Get your form element
    const form = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    
    // Add event listener for form submission
    if (form) {
        form.addEventListener('submit', function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Update button to show loading state
            const submitButton = form.querySelector('.submit-btn');
            const originalText = submitButton.innerText;
            submitButton.innerText = 'Sending...';
            submitButton.disabled = true;
            
            // Clear any previous status messages
            formStatus.innerHTML = '';
            formStatus.className = 'form-status';
            
            // Get form data
            const formData = new FormData(form);
            
            // Send the data to Formspree
            fetch('https://formspree.io/f/xkgjvrla', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Network response was not ok.');
            })
            .then(data => {
                // Show success message
                formStatus.innerHTML = 'Thanks! Your message has been sent.';
                formStatus.className = 'form-status success';
                
                // Reset the form
                form.reset();
            })
            .catch(error => {
                // Show error message
                formStatus.innerHTML = 'Oops! There was a problem submitting your form. Please try again.';
                formStatus.className = 'form-status error';
                console.error('Error:', error);
            })
            .finally(() => {
                // Reset button state
                submitButton.innerText = originalText;
                submitButton.disabled = false;
            });
        });
    }
});