/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2CB67D', // Bright Mint/Teal (Main Action)
                    50: '#E6F8F0',
                    100: '#C0ECD9',
                    200: '#95DFC0',
                    300: '#69D1A7',
                    400: '#48C492',
                    500: '#2CB67D',
                    600: '#239565', // Darker mint for hover
                    700: '#1B734E',
                    800: '#145439',
                    900: '#0C3524',
                },
                secondary: {
                    DEFAULT: '#0F392B', // Deep Forest Green (Headers/Backgrounds)
                    50: '#F2F7F5',
                    100: '#DEEBE6',
                    200: '#C2D9D1',
                    300: '#A3C4B9',
                    400: '#84AD9F',
                    500: '#679586',
                    600: '#4D7A6D',
                    700: '#355E53',
                    800: '#204139',
                    900: '#0F392B',
                },
                neutral: {
                    beige: '#F3EFD9', // Warm Beige / Soft Sand
                    cream: '#FEFEFA', // Light Cream
                    sage: '#9CAF88',  // Medium Sage
                },
                text: {
                    main: '#0F392B', // Deep forest green for main text
                    DEFAULT: '#0F392B',
                    light: '#355E53', // Lighter forest for body
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'], // Keep Inter for now, user suggested it
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '18px', // Custom for "12-18px"
                '4xl': '2rem',
                '5xl': '2.5rem',
                'pill': '9999px',
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(15, 57, 43, 0.1)', // Soft shadow using forest green
            }
        },
    },
    plugins: [],
}
