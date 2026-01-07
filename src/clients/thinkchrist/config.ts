/**
 * ThinkChrist Client Configuration
 * Contains all client-specific branding, authentication rules, and theme settings.
 */

export const thinkchristConfig = {
    // Client metadata
    metadata: {
        id: 'thinkchrist',
        name: 'ThinkChrist',
        description: 'Learn Together, Grow Together - A collaborative platform for academic success'
    },

    // Branding configuration
    branding: {
        organizationName: 'Christ UniConnect',
        appName: 'ThinkChrist',
        footerText: '© 2024 ThinkChrist. All rights reserved.',
        logoUrl: '/logo.png',
        auth: {
            loginTitle: 'Welcome Back',
            loginDescription: 'Sign in to your account to continue',
            emailPlaceholder: 'name@christuniversity.in'
        }
    },

    // Authentication configuration
    auth: {
        // Comprehensive list of Christ University email domains
        allowedDomains: [
            'christuniversity.in',
            'mba.christuniversity.in',
            'res.christuniversity.in',
            'btech.christuniversity.in',
            'mtech.christuniversity.in',
            'msc.christuniversity.in',
            'bsc.christuniversity.in',
            'bcom.christuniversity.in',
            'mcom.christuniversity.in',
            'ba.christuniversity.in',
            'ma.christuniversity.in',
            'bca.christuniversity.in',
            'mca.christuniversity.in',
            'law.christuniversity.in',
            'arts.christuniversity.in',
            'science.christuniversity.in',
            'commerce.christuniversity.in',
            'engineering.christuniversity.in',
            'management.christuniversity.in',
            'humanities.christuniversity.in',
            'socialsciences.christuniversity.in',
            'pg.christuniversity.in',
            'ug.christuniversity.in',
            'phd.christuniversity.in',
            'faculty.christuniversity.in',
            'staff.christuniversity.in'
        ],

        // Available departments
        departments: [
            'Computer Science',
            'Information Technology',
            'Electronics',
            'Mechanical',
            'Civil',
            'Electrical',
            'Chemical',
            'Biotechnology',
            'Mathematics',
            'Physics',
            'Chemistry',
            'Commerce',
            'Management',
            'Law',
            'Arts',
            'Humanities'
        ],

        // Domain to department mapping for auto-detection
        domainMap: {
            'btech.christuniversity.in': 'Engineering',
            'mtech.christuniversity.in': 'Engineering',
            'mba.christuniversity.in': 'Management',
            'bcom.christuniversity.in': 'Commerce',
            'mcom.christuniversity.in': 'Commerce',
            'bsc.christuniversity.in': 'Science',
            'msc.christuniversity.in': 'Science',
            'ba.christuniversity.in': 'Arts',
            'ma.christuniversity.in': 'Arts',
            'bca.christuniversity.in': 'Computer Science',
            'mca.christuniversity.in': 'Computer Science',
            'law.christuniversity.in': 'Law',
            'engineering.christuniversity.in': 'Engineering',
            'management.christuniversity.in': 'Management',
            'commerce.christuniversity.in': 'Commerce',
            'science.christuniversity.in': 'Science',
            'arts.christuniversity.in': 'Arts',
            'humanities.christuniversity.in': 'Humanities'
        }
    },

    // Theme configuration
    theme: {
        colors: {
            primary: '#2b65ec', // Electric Royal Blue
            secondary: '#fbbf24' // Luminous Amber
        }
    }
}
