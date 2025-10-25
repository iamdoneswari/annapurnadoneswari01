import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'; // <-- ADD useRef
import axios from 'axios';
import logo from './assets/annapurna-logo.png'; // <-- Does 'annapurna-logo.png' EXACTLY match your file?
import donorImage from './assets/donor-food-donation.png'; // Make sure filename matches yours!
import receiverImage from './assets/receiver-meal.png';
import riderImage from './assets/rider-delivery.png';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet'; // Import Leaflet library itself
import 'leaflet/dist/leaflet.css';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css'; // Import the CSS
// --- Paste this function near the top, after imports ---

/**
 * Calculates the distance between two points using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
        return null; // Return null if any coordinate is missing
    }
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// --- END Distance Function ---

// const Annapurna = () => { ... rest of your component
// --- FIX for Leaflet Icons ---
// This fixes the common issue where markers don't appear
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    iconAnchor: [12, 41] // Manually set anchor for default icon
});
// --- END FIX ---

// --- CONFIGURATION ---
const API_BASE_URL = 'http://localhost:5000/api';

// --- ISOLATED AUTH FORM COMPONENT ---
const AuthForm = React.memo(({ title, action, isRegister, role, loading, networkError, setView }) => {
    const [localForm, setLocalForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });

    const handleLocalChange = (e) => {
        setLocalForm({ ...localForm, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        action(localForm, role);
    };

    // Reset form when the view changes (e.g., switching between login/register)
    useEffect(() => {
        setLocalForm({ name: '', email: '', password: '', phone: '', address: '' });
    }, [title, isRegister, role]);


    return (
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            <button
                onClick={() => setView('home')} // Uses the new setView prop
                className="absolute top-4 left-4 text-gray-500 hover:text-gray-700 transition duration-300"
                aria-label="Back to Home"
            >
                {/* Simple Back Arrow SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{title}</h2>
            {isRegister && role && <p className="text-center text-sm text-blue-600 mb-4 font-semibold">{`Registering as ${role.toUpperCase()}`}</p>}
            <form onSubmit={handleSubmit}>
                {isRegister && (
                    <div className="space-y-4">
                        <input type="text" name="name" placeholder="Name" value={localForm.name} onChange={handleLocalChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        <input type="email" name="email" placeholder="Email (Login/ID)" value={localForm.email} onChange={handleLocalChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        <input type="tel" name="phone" placeholder="Phone Number" value={localForm.phone} onChange={handleLocalChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                        <input type="text" name="address" placeholder="Address (For Pickup/Delivery)" value={localForm.address} onChange={handleLocalChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                )}
                {!isRegister && (
                    <input type="email" name="email" placeholder="Email (Login/ID)" value={localForm.email} onChange={handleLocalChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                )}
                <input type="password" name="password" placeholder="Password" value={localForm.password} onChange={handleLocalChange} required className="w-full p-3 border border-gray-300 rounded-lg mt-4 focus:ring-blue-500 focus:border-blue-500" />
                <button type="submit" disabled={loading} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-300 disabled:opacity-50">
                    {loading ? 'Processing...' : title}
                </button>
            </form>
            {/* --- PASTE THIS CODE BLOCK HERE --- */}
            <div className="mt-6 text-center text-sm">
                {isRegister ? (
                    // Link to Login page if currently on Register page
                    <p className="text-gray-600">
                        Already have an account?{' '}
                        <button
                            onClick={() => setView('login')}
                            className="text-blue-600 hover:underline font-semibold"
                        >
                            Login here
                        </button>
                    </p>
                ) : (
                    // Link to Register page if currently on Login page
                    <p className="text-gray-600">
                        Need an account?{' '}
                        {/* You might want separate buttons/links for each role registration */}
                        <button
                            onClick={() => setView('home')} // Go back home to choose role
                            className="text-blue-600 hover:underline font-semibold"
                        >
                            Register here
                        </button>
                    </p>
                )}
            </div>
            {/* --- END OF CODE BLOCK --- */}
            {networkError && !networkError.includes('Network Error') && <p className="text-red-500 mt-4 text-center">{networkError}</p>}
        </div>
    );
});

// --- NEW HomePage Component ---
// (Place this code OUTSIDE the main Annapurna component, e.g., right ABOVE it in the file)

const useIntersectionObserver = (options) => {
    const [elements, setElements] = React.useState([]);
    const [entries, setEntries] = React.useState([]);

    const observer = React.useRef(new IntersectionObserver((observedEntries) => {
        setEntries(observedEntries);
    }, options));

    React.useEffect(() => {
        const currentObserver = observer.current;
        elements.forEach((element) => currentObserver.observe(element));
        return () => elements.forEach((element) => currentObserver.unobserve(element));
    }, [elements]);

    const setNodeRef = React.useCallback((node) => {
        if (node) {
            setElements((prevElements) => [...prevElements, node]);
        }
    }, []);

    return [setNodeRef, entries];
};

const AnimatedSection = ({ children, className, animationClass = 'animate-fade-in-up' }) => {
    const [ref, entries] = useIntersectionObserver({
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '-50px 0px', // Start animation slightly before it's fully in view
    });
    const isVisible = entries.some(entry => entry.isIntersecting);

    return (
        <div ref={ref} className={`${className} ${isVisible ? animationClass : 'opacity-0 transform translate-y-8'}`}>
            {children}
        </div>
    );
};
const HomePage = ({ setView }) => {

    return (
        <div className="bg-gradient-to-b from-blue-50 to-white min-h-screen font-sans text-gray-800">
            {/* --- Enhanced Header for Home Page --- */}
            <nav className="bg-white shadow-lg p-4 fixed top-0 w-full z-20"> {/* Elevated shadow */}
                <div className="container mx-auto flex justify-between items-center">
                    <div
                        className="flex items-center cursor-pointer transform hover:scale-105 transition duration-300" // Added hover effect
                        onClick={() => setView('home')}
                    >
                        <img src={logo} alt="Annapurna Logo" className="h-9 w-9 rounded-full object-cover mr-2 shadow-md" /> {/* Added shadow to logo */}
                        <h1 className="text-3xl font-extrabold text-blue-700"> {/* Darker blue for text */}
                            Annapurna
                        </h1>
                    </div>
                    <div className="hidden md:flex space-x-6 items-center">
                        <a href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition duration-300 transform hover:scale-105">About</a>
                        <a href="#contact" className="text-gray-700 hover:text-blue-600 font-medium transition duration-300 transform hover:scale-105">Contact</a>
                        <button
                            onClick={() => setView('login')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-full transition duration-300 shadow-md transform hover:scale-105 hover:shadow-lg" // Added more pronounced hover
                        >
                            Join Now / Login
                        </button>
                    </div>
                    {/* Mobile Menu Button (Optional - for future enhancement) */}
                    <div className="md:hidden">
                        <button onClick={() => setView('login')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 shadow-md text-sm transform hover:scale-105">
                            Join/Login
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <header className="pt-40 pb-20 text-center relative overflow-hidden"> {/* Increased padding, added overflow hidden */}
                <div className="container mx-auto px-4 relative z-10">
                    <h2 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-fade-in-down"> {/* Darker text, larger font, fade-in */}
                        Combat Food Waste. <span className="text-blue-600">Nourish Lives.</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto animate-fade-in delay-200"> {/* Larger text, fade-in with delay */}
                        Annapurna intelligently connects surplus food to those in need, fostering sustainability, community, and well-being.
                    </p>
                    <button
                        onClick={() => setView('login')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-4 px-10 rounded-full transition duration-500 shadow-xl text-xl transform hover:-translate-y-1 hover:scale-105 animate-pop-in delay-400" // Gradient, more prominent, pop-in
                    >
                        Get Started Today
                    </button>
                </div>
                {/* Subtle background animation for hero section */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 animate-pulse-bg -z-0"></div>
            </header>

            {/* --- Role Sections --- */}
            <section id="about" className="py-20 bg-white relative z-10"> {/* More padding, z-index to be above hero bg */}
                <div className="container mx-auto px-4 space-y-24"> {/* Increased space between sections */}

                    {/* Donor Section */}
                    <AnimatedSection className="flex flex-col md:flex-row items-center gap-10 md:gap-16 bg-gradient-to-br from-green-50 to-white p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition duration-500 transform hover:-translate-y-1"> {/* Animated, gradient bg, enhanced shadow/hover */}
                        <div className="md:w-1/2 flex justify-center">
                            <img src={donorImage} alt="Donating Food" className="rounded-2xl shadow-xl w-full max-w-lg object-cover transform hover:scale-102 transition duration-300" /> {/* Larger border radius, hover scale */}
                        </div>
                        <div className="md:w-1/2 text-center md:text-left">
                            <h3 className="text-4xl font-extrabold text-gray-900 mb-4">Empower Change: <span className="text-green-600">Become a Donor</span></h3>
                            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                                Seamlessly list your surplus meals or ingredients. Our AI provides precise nutritional estimates, and our dedicated riders ensure swift, secure pickups. Drastically reduce food waste and champion community welfare.
                            </p>
                            <button
                                onClick={() => setView('registerdonor')}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg transform hover:scale-105 hover:-translate-y-1"
                            >
                                Donate Food Now
                            </button>
                        </div>
                    </AnimatedSection>

                    {/* Receiver Section (Alternating Layout) */}
                    <AnimatedSection className="flex flex-col md:flex-row-reverse items-center gap-10 md:gap-16 bg-gradient-to-br from-blue-50 to-white p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition duration-500 transform hover:-translate-y-1"> {/* Animated, gradient bg, enhanced shadow/hover */}

                        <div className="md:w-1/2 flex justify-center">
                            <img src={riderImage} alt="Delivery Rider" className="rounded-2xl shadow-xl w-full max-w-lg object-cover transform hover:scale-102 transition duration-300" />
                        </div>
                        <div className="md:w-1/2 text-center md:text-left">
                            <h3 className="text-4xl font-extrabold text-gray-900 mb-4">Nourish Yourself: <span className="text-blue-600">Find Meals Easily</span></h3>
                            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                                Access wholesome food listings conveniently located near you, complete with transparent nutritional insights. Claim safe, free meals with ease and dignity, ensuring no one goes hungry.
                            </p>
                            <button
                                onClick={() => setView('registerreceiver')}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg transform hover:scale-105 hover:-translate-y-1"
                            >
                                Receive Food Here
                            </button>
                        </div>
                    </AnimatedSection>

                    {/* Rider Section */}
                    <AnimatedSection className="flex flex-col md:flex-row items-center gap-10 md:gap-16 bg-gradient-to-br from-indigo-50 to-white p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition duration-500 transform hover:-translate-y-1"> {/* Animated, gradient bg, enhanced shadow/hover */}
                        <div className="md:w-1/2 flex justify-center">
                            <img src={receiverImage} alt="Receiving Meal" className="rounded-2xl shadow-xl w-full max-w-lg object-cover transform hover:scale-102 transition duration-300" />
                        </div>
                        <div className="md:w-1/2 text-center md:text-left">
                            <h3 className="text-4xl font-extrabold text-gray-900 mb-4">Drive Impact: <span className="text-indigo-600">Become a Rider</span></h3>
                            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                                Join our vital delivery network. Pick up surplus food orders in your vicinity, deliver them efficiently, and earn a commission while making a tangible, positive difference in your community.
                            </p>
                            <button
                                onClick={() => setView('registerrider')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg transform hover:scale-105 hover:-translate-y-1"
                            >
                                Deliver with Annapurna
                            </button>
                        </div>
                    </AnimatedSection>

                </div>
            </section>

            {/* --- Simple Contact Section --- */}
            <section id="contact" className="py-20 bg-gray-100 text-center relative z-10"> {/* More padding */}
                <div className="container mx-auto px-4">
                    <h3 className="text-4xl font-extrabold text-gray-900 mb-5">Have Questions? <span className="text-blue-600">Get In Touch</span></h3>
                    <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
                        Whether you're looking to partner, have feedback, or just want to learn more, our team is ready to connect with you.
                    </p>
                    <a href="mailto:support@annapurna.app" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg transform hover:scale-105 hover:-translate-y-1">
                        Contact Our Team
                    </a>
                </div>
            </section>

            {/* --- Standard Footer --- */}
            <footer className="text-center p-8 text-sm text-gray-500 bg-gray-50 border-t border-gray-200"> {/* More padding, lighter bg */}
                Annapurna Hackathon Project - {new Date().getFullYear()} | Built with MERN & ❤️ | All Rights Reserved.
            </footer>
        </div>
    );
};
// --- PASTE THIS ENHANCED LocationSelectorModal near the bottom of Annapurna.jsx ---
// (Replace the old LocationSelectorModal entirely)

const LocationSelectorModal = ({ isOpen, onClose, onLocationSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [locationError, setLocationError] = useState(null);

    // Geocoding provider (OpenStreetMap)
    const provider = useMemo(() => new OpenStreetMapProvider(), []); // Memoize provider

    // Debounce timer reference
    const debounceTimeoutRef = useRef(null);

    // Fetch suggestions when searchQuery changes (with debounce)
    useEffect(() => {
        // Clear previous timeout if user types again quickly
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        if (searchQuery.trim().length < 3) { // Only search if query is long enough
            setSuggestions([]);
            setLoadingSuggestions(false);
            return;
        }

        setLoadingSuggestions(true);
        setLocationError(null);

        // Set a new timeout
        debounceTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await provider.search({ query: searchQuery });
                setSuggestions(results || []);
            } catch (error) {
                console.error("Geocoding search error:", error);
                setLocationError("Failed to fetch address suggestions.");
                setSuggestions([]);
            } finally {
                setLoadingSuggestions(false);
            }
        }, 500); // Wait 500ms after user stops typing

        // Cleanup function to clear timeout if component unmounts or query changes again
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchQuery, provider]); // Re-run effect when searchQuery or provider changes

    // Handle selecting a suggestion
    const handleSelectSuggestion = (suggestion) => {
        console.log("Selected:", suggestion);
        onLocationSelect({
            lat: suggestion.y, // Latitude from suggestion
            lng: suggestion.x, // Longitude from suggestion
            addressString: suggestion.label // The full address text
        });
        onClose(); // Close modal after selection
    };

    // Handle using current location
    const handleUseCurrentLocation = async () => {
        setLoadingLocation(true);
        setLocationError(null);
        try {
            const position = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("Geolocation not supported."));
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            });
            onLocationSelect({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                addressString: "Current Location (Approx.)" // Provide a default string
            });
            onClose();
        } catch (error) {
            console.error("Error getting location:", error);
            setLocationError("Could not get location. Enable browser location services.");
        } finally {
            setLoadingLocation(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg relative"> {/* Increased max-width */}
                <button onClick={onClose} className="absolute top-2 right-3 text-gray-400 hover:text-gray-600">
                    &times; {/* Simple close button */}
                </button>
                <h3 className="text-xl font-bold mb-4 text-gray-800">Set Donation Pickup Location</h3>

                {/* Manual Address Search */}
                <div className="mb-4 relative">
                    <label htmlFor="addressSearch" className="block text-sm font-medium text-gray-700 mb-1">Search for Address:</label>
                    <input
                        id="addressSearch"
                        type="text"
                        placeholder="Start typing address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    {loadingSuggestions && <p className="text-xs text-blue-500 mt-1 animate-pulse">Searching...</p>}
                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                            {suggestions.map((suggestion, index) => (
                                <li
                                    key={suggestion.raw.place_id || index} // Use place_id if available
                                    onClick={() => handleSelectSuggestion(suggestion)}
                                    className="p-3 hover:bg-blue-100 cursor-pointer text-sm"
                                >
                                    {suggestion.label}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="text-center text-gray-500 my-4 text-sm font-semibold">-- OR --</p>

                {/* Use Current Location Button */}
                <button
                    onClick={handleUseCurrentLocation}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center disabled:opacity-60"
                    disabled={loadingLocation || loadingSuggestions}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {loadingLocation ? 'Getting Location...' : 'Use My Current Location'}
                </button>

                {locationError && <p className="text-red-500 mt-4 text-sm text-center">{locationError}</p>}

                <button
                    onClick={onClose}
                    className="mt-6 w-full text-sm text-center text-gray-500 hover:text-gray-700"
                    disabled={loadingLocation || loadingSuggestions}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
// --- END of ENHANCED LocationSelectorModal ---
const Annapurna = () => {
    // --- STATE MANAGEMENT ---
    const [userProfile, setUserProfile] = useState(null);
    const [view, setView] = useState('home');
    const [listings, setListings] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false); // General loading for actions
    const [dataLoading, setDataLoading] = useState(true); // Specific loading for initial data fetch
    const [error, setError] = useState(null);
    const [isBackendConnected, setIsBackendConnected] = useState(false);
    const [initialLoadError, setInitialLoadError] = useState(null);
    // --- ADD THESE NEW STATE VARIABLES ---
    const [newDonationNotes, setNewDonationNotes] = useState('');

    // State for the Donor Dashboard tabs
    const [donorActiveTab, setDonorActiveTab] = useState('create'); // 'create', 'active', 'history'

    // State for the "Create New Donation" form
    const [newDonationItems, setNewDonationItems] = useState([{ id: Date.now(), itemName: '', quantity: 1, unit: 'servings', ingredients: '' }]); // Array for multiple items
    const [newDonationPickupTime, setNewDonationPickupTime] = useState(''); // State for pickup time window
    const [newDonationVeg, setNewDonationVeg] = useState('veg'); // Veg/Non-veg for the whole donation
    // --- END of new state variables ---
    // --- ADD THIS NEW STATE VARIABLE ---
    const [newDonationShelfLife, setNewDonationShelfLife] = useState(6); // Default to 6 hours
    // --- END ADD ---
    // --- ADD THIS STATE VARIABLE ---
    const [editingListing, setEditingListing] = useState(null); // Holds the listing being edited
    // --- END ADD ---
    // --- ADD THESE STATES ---
    const [hoveredListingId, setHoveredListingId] = useState(null); // ID of the card being hovered
    const [routeLinePositions, setRouteLinePositions] = useState([]); // Array of [lat, lng] pairs for the line
    // --- END ADD ---
    // --- ADD THESE STATES for Filtering ---
    const [nearbySearchQuery, setNearbySearchQuery] = useState(''); // For the search bar input
    const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all', 'veg', 'non-veg'
    // --- END ADD ---
    // ... (existing state declarations) ...
    const [newDonationLocation, setNewDonationLocation] = useState({
        lat: null,
        lng: null,
        addressString: '' // Add addressString
    });
    const [receiverCurrentLocation, setReceiverCurrentLocation] = useState({ lat: null, lng: null }); // For Receiver's map center
    const [showLocationModal, setShowLocationModal] = useState(false); // For a modal to confirm donor location
    // ...
    // --- FORM STATES ---
    const [receiverSelectedListing, setReceiverSelectedListing] = useState(null);
    const [receiverRatingForm, setReceiverRatingForm] = useState({ rating: 5, review: '' });
    // --- ADD THIS STATE ---
    const [receiverLocation, setReceiverLocation] = useState({
        lat: null,
        lng: null,
        addressString: 'Set Your Location' // Default text
    });
    const [showReceiverLocationModal, setShowReceiverLocationModal] = useState(false);
    // --- END ADD ---
    // --- DATA FETCHING ---
    const fetchData = useCallback(async (isInitialLoad = false) => {


        const activeDashboards = ['donor', 'receiver', 'rider'];
        if (!isInitialLoad && !activeDashboards.includes(view)) {
            // console.log("Skipping background fetch, not on an active dashboard."); // Optional debug log
            return; // Stop fetching if not on a relevant page
        }
        // --- END ADD ---
        if (!isBackendConnected && !isInitialLoad) return;
        if (!isInitialLoad) setDataLoading(true); // Show loading for polling updates too

        // Debug Log: Indicate fetch start
        // console.log(`Fetching data (Initial: ${isInitialLoad}). User: ${userProfile?._id}, Role: ${userProfile?.role}`);


        try {
            // Fetch Listings always
            // --- NEW CODE ---
            // Create the auth config object
            const config = {};
            if (userProfile && userProfile.token) {
                config.headers = { Authorization: `Bearer ${userProfile.token}` };
            }
            // Pass the config to the GET request
            const listingsResPromise = axios.get(`${API_BASE_URL}/listings`, config);
            // --- END NEW CODE ---

            // Fetch Orders based on user role
            let ordersPromise;
            if (userProfile) {
                if (userProfile.role === 'rider') {
                    ordersPromise = Promise.all([
                        axios.get(`${API_BASE_URL}/orders/awaiting-rider`),
                        axios.get(`${API_BASE_URL}/orders/user/${userProfile._id}`)
                    ]).then(([awaitingRes, myOrdersRes]) => {
                        // Combine and deduplicate
                        const orderMap = new Map();
                        [...awaitingRes.data, ...myOrdersRes.data].forEach(order => orderMap.set(order._id, order));
                        return Array.from(orderMap.values());
                    });
                } else if (userProfile.role === 'receiver') {
                    ordersPromise = axios.get(`${API_BASE_URL}/orders/user/${userProfile._id}`).then(res => res.data);
                } else {
                    // Donors don't need global orders, maybe fetch their specific related orders if needed later
                    ordersPromise = Promise.resolve([]); // Resolve empty for Donor
                }
            } else {
                ordersPromise = Promise.resolve([]); // No orders if not logged in
            }


            // Wait for all fetches
            const [listingsRes, ordersData] = await Promise.all([listingsResPromise, ordersPromise]);

            // Debug Log: Show fetched data
            // console.log("Fetched Listings:", listingsRes.data.length);
            // console.log("Fetched Orders:", ordersData.length);


            setListings(listingsRes.data);
            setOrders(ordersData);

            if (!isBackendConnected) setIsBackendConnected(true);
            setInitialLoadError(null);
            setError(null);

        } catch (e) {
            // --- MODIFY THIS CATCH BLOCK ---
            // --- MODIFY CATCH BLOCK AGAIN ---
            if (isInitialLoad) {
                // If the very FIRST load fails, set the critical error and mark as disconnected
                setInitialLoadError("Network Error: Ensure backend is running & accessible.");
                setIsBackendConnected(false);
                setError(null); // Clear any potentially misleading transient error
            } else {
                // If a background POLL fails:
                // 1. DO NOT set initialLoadError.
                // 2. DO NOT set the general 'error' state (to prevent blinking).
                // 3. Just log it. The next successful poll will update data.
                console.warn("Polling data fetch failed. Will retry shortly. User experience not interrupted.");
                // We *could* set a very subtle, non-blocking indicator if needed, but let's avoid it for now.
                // e.g., setPollingError(true); -> display small icon in header?
            }
            // --- END MODIFICATION ---
        } finally {
            setDataLoading(false); // Ensure loading is turned off
        }
    }, [userProfile]);

    // --- REPLACE the entire first useEffect hook (around line 315) with this ---

    // --- REPLACE the entire first useEffect hook with this ---
    // ... (after fetchData, handleLogin, etc.) ...

    // --- GEOLOCATION HELPER ---
    const getUserLocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        });
                    },
                    (error) => {
                        console.error("Error getting user's location:", error);
                        reject(error);
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            } else {
                reject(new Error("Geolocation is not supported by this browser."));
            }
        });
    }, []);
    // --- END GEOLOCATION HELPER ---
    // --- PASTE THIS CLEAN VERSION ---
    // First useEffect: Initial Load Only
    useEffect(() => {
        // --- Initial Setup ---
        const storedUser = localStorage.getItem('annapurnaUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setUserProfile(user);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('annapurnaUser');
                setView('home');
            }
        } else {
            setView('home');
        }

        // --- Perform the very first data fetch ---
        console.log("Performing initial data fetch..."); // Debug log
        fetchData(true); // Initial load

        // --- NO POLLING LOGIC AT ALL ---

        // --- NO CLEANUP FUNCTION NEEDED ---

        // Dependency: Only fetchData is needed here.
        // This hook runs once on mount.
    }, []);
    // --- END of final cleaned useEffect hook ---
    // ... (renderHome, renderLogin, etc. functions) ...
    // Initial Load Effect (Runs only once on mount)
    // ... (fetchData function ends) ...

    // --- NEW, UPDATED useEffect hook ---
    // Initial Load and Polling Effect
    // --- CORRECTED FIRST useEffect using useRef ---
    // --- SIMPLIFIED First useEffect (Initial Load Only) ---

    // --- KEEP THIS SECOND useEffect ---
    // Effect to update view based on userProfile and fetch relevant data
    // Effect to update view based on userProfile and fetch relevant data
    useEffect(() => {
        if (userProfile?._id) { // Check if userProfile is valid and has an ID
            // User logged in or loaded from storage
            if (view !== userProfile.role) { // Only set view if it's different
                setView(userProfile.role); // Navigate to their dashboard
            }
            // Fetch data relevant to this user *after* profile is confirmed
            console.log("User profile changed, fetching non-initial data..."); // Debug log
            fetchData(false); // Fetch data for the logged-in user (not initial load)

        } else {
            // User logged out or not found in storage
            // Ensure view is home unless user is actively navigating to login/register
            if (view !== 'login' && !view.startsWith('register')) {
                setView('home');
            }
            // Clear data immediately on logout (already done in handleLogout, but safe to keep here too)
            setListings([]);
            setOrders([]);
        }
    }, [userProfile, fetchData]); // <-- KEEP fetchData in dependencies here
    const handleDeleteListing = async (listingId) => {
        if (!userProfile) return setError("Login required.");

        // eslint-disable-next-line no-restricted-globals
        if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
            return;
        }

        // --- THIS IS THE FIX ---
        // Use handleApiAction which correctly sends the token
        await handleApiAction(
            'delete',
            `/listings/${listingId}`, // The API endpoint
            {},     // No payload for delete
            'Listing deleted successfully!' // The success message
        );
    };
    // --- END of handleDeleteListing function ---
    // --- AUTHENTICATION HANDLERS ---
    const handleAuthAction = async (apiEndpoint, formData, role = null) => {
        setLoading(true);
        setError(null);
        try {
            const payload = role ? { ...formData, role } : { email: formData.email, password: formData.password };
            const res = await axios.post(`${API_BASE_URL}/auth/${apiEndpoint}`, payload);
            setUserProfile(res.data); // Update userProfile state
            localStorage.setItem('annapurnaUser', JSON.stringify(res.data));
            setView(res.data.role);
            // No need to call fetchData here, the useEffect dependency on userProfile handles it
        } catch (e) {
            setError(e.response?.data?.message || e.message || `${apiEndpoint === 'register' ? 'Registration' : 'Login'} failed.`);
        } finally {
            setLoading(false);
        }
    };
    const handleRegister = (formData, role) => handleAuthAction('register', formData, role);
    // --- Inside Annapurna Component ---

    const handleLogin = async (formData) => { // <-- It correctly receives formData
        setLoading(true);
        setError(null);
        try {
            // FIX: Use formData.email and formData.password
            const res = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: formData.email, // Use property from the object
                password: formData.password // Use property from the object
            });

            // --- CRUCIAL: Destructure the token from the response ---
            const { _id, name, role, address, token } = res.data;

            // Prepare the profile to save (including the token)
            const loggedInUserProfile = { _id, name, role, address, token };

            setUserProfile(loggedInUserProfile);
            localStorage.setItem('annapurnaUser', JSON.stringify(loggedInUserProfile));
            setView(res.data.role); // View update is handled by the useEffect
            fetchData(); // Fetch data immediately on login

        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    // --- END of corrected handleLogin function ---


    const handleLogout = () => {
        setUserProfile(null);
        localStorage.removeItem('annapurnaUser');
        setView('home');
        setOrders([]);
        setListings([]);
        setError(null);
        setInitialLoadError(null); // Clear initial error on logout
        setIsBackendConnected(true); // Assume backend is still ok unless initial load fails again
    };

    const handleApiAction = async (method, endpoint, payload = {}, successMessage) => {
        if (!userProfile || !userProfile.token) { // <-- Added check for userProfile.token here
            setError("Login required to perform this action or token missing."); // More specific error
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // --- THIS IS THE CRUCIAL CHANGE ---
            const config = {
                headers: {
                    Authorization: `Bearer ${userProfile.token}`
                }
            };

            // For GET, DELETE methods, the payload usually goes in the config object itself.
            // For POST, PUT, PATCH, payload is the second argument, config is the third.
            // We'll adjust based on method.

            if (method === 'get' || method === 'delete') {
                // For GET/DELETE, payload might be query params or body, but typically goes in config
                // For simplicity, we'll assume GET/DELETE don't strictly need a 'payload' object here
                // or that 'payload' would be part of 'config.params' for GET.
                // If you use payload for body in DELETE, it would be await axios.delete(url, {data: payload, ...config})
                // For most cases:

                await axios[method](`${API_BASE_URL}${endpoint}`, config);
            } else { // 'post', 'put', 'patch' - methods that typically have a request body
                await axios[method](`${API_BASE_URL}${endpoint}`, payload, config); // <-- Payload is 2nd, config is 3rd
            }
            // --- END CRUCIAL CHANGE ---

            console.log(successMessage);
            // Reset forms or close modals specific to action
            if (endpoint === '/listings') { // Create Listing
                // Reset donor form states after successful creation here
                setNewDonationItems([{ id: Date.now(), itemName: '', quantity: 1, unit: 'servings', ingredients: '' }]);
                setNewDonationPickupTime('');
                setNewDonationShelfLife(6);
                setNewDonationVeg('veg');
                setNewDonationNotes('');
                setNewDonationLocation({ lat: null, lng: null, addressString: '' }); // <-- ADDED THIS RESET LINE
                setDonorActiveTab('active'); // Go back to active listings
            } else if (endpoint.includes('/rate')) { // Rate Listing
                // ...else if (endpoint.includes('/rate')) { // Rate Listing
                setReceiverSelectedListing(null);
                setReceiverRatingForm({ rating: 5, review: '' });
            } else if (endpoint === '/orders/claim') { // Claim Food
                setReceiverSelectedListing(null);
            }
            // Always fetch data after a successful action
            fetchData();
        } catch (e) {
            // Improved error message for frontend
            const errorMessage = e.response?.data?.message || `Action failed: ${successMessage}. Network error or unknown server issue.`;
            setError(errorMessage);
            console.error("API Action Error:", e.response?.data || e.message); // Log full error details
        } finally {
            setLoading(false);
        }
    };

    // --- ADD THIS FUNCTION ---
    const handleStartEdit = (listing) => {
        setEditingListing(listing);
        // For now, just log or show a message. Later, open a modal or switch view.
        console.log("Start editing listing:", listing);
        alert(`Editing for listing "${listing.foodItem}" is not fully implemented yet.`); // Placeholder alert
        // TODO: Implement modal/form for editing using 'editingListing' state
        setEditingListing(null); // Reset immediately for now
    };
    // --- END ADD ---

    // --- REPLACE the old handleCreateListing function with this ---

    // --- REPLACE the old handleCreateListing function with this ---

    // --- NEW (CORRECT) CODE ---
    const handleCreateListing = async () => {
        if (!userProfile) return setError("Login required.");

        // Validations
        if (!newDonationItems.some(item => item.itemName.trim() !== '')) return setError("Add at least one item name.");
        if (!newDonationPickupTime.trim()) return setError("Suggest a pickup time.");
        if (!newDonationShelfLife || newDonationShelfLife < 1) return setError("Enter valid shelf life.");
        // --- LOCATION VALIDATION ---
        if (!newDonationLocation.lat || !newDonationLocation.lng) {
            return setError("Please set a valid donation location.");
        }

        // Prepare payload
        const listingData = {
            // The backend gets donorId, donorName, and address from the token (req.user)
            // We only need to send the food details
            items: newDonationItems, // Send the full items array
            pickupTimeWindow: newDonationPickupTime,
            shelfLifeHours: parseInt(newDonationShelfLife, 10),
            veg: newDonationVeg,
            notes: newDonationNotes,
            address: newDonationLocation.addressString, // <-- ADD THIS LINE
            location: { // Send the location in GeoJSON format
                type: 'Point',
                coordinates: [newDonationLocation.lng, newDonationLocation.lat] // [Longitude, Latitude]
            }
        };

        // --- THIS IS THE FIX ---
        // Use handleApiAction which correctly sends the token
        await handleApiAction(
            'post',
            '/listings', // The API endpoint
            listingData,   // The payload
            'Donation successfully listed!' // The success message
        );
        // The reset logic is now inside handleApiAction
    };
    // --- END of updated handleCreateListing function ---

    // --- END of updated handleCreateListing function ---
    const handleClaimFood = (listingId) => handleApiAction(
        'post',
        '/orders/claim',
        { listingId, receiverId: userProfile._id, receiverName: userProfile.name, receiverAddress: userProfile.address },
        'Food claimed successfully!'
    );
    const handleRatingSubmission = (listingId, rating, reviewText) => handleApiAction(
        'post',
        `/listings/${listingId}/rate`,
        { rating, review: reviewText, reviewerId: userProfile._id, reviewerName: userProfile.name },
        'Rating submitted successfully!'
    );
    const handleRiderAccept = (orderId) => handleApiAction(
        'put',
        `/orders/${orderId}/accept`,
        { riderId: userProfile._id, riderName: userProfile.name },
        'Order accepted!'
    );
    const handleDeliveryComplete = (orderId) => handleApiAction(
        'put',
        `/orders/${orderId}/deliver`,
        {},
        'Delivery complete!'
    );


    // --- MEMOIZED DATA FOR VIEWS ---
    const dataForCurrentRole = useMemo(() => {
        // Return empty if userProfile is null, except for availableListings on home
        if (!userProfile && view !== 'home') {
            return { donorListings: [], availableOrders: [], myActiveOrders: [], availableListings: [], receiverOrders: [] };
        }
        // Show available listings on home page regardless of login status
        const availableListingsForHome = listings.filter(l => l.status === 'available');

        if (!userProfile && view === 'home') {
            return { donorListings: [], availableOrders: [], myActiveOrders: [], availableListings: availableListingsForHome, receiverOrders: [] };
        }

        // Ensure userProfile exists before filtering based on it
        if (!userProfile) return { donorListings: [], availableOrders: [], myActiveOrders: [], availableListings: [], receiverOrders: [] };


        const filtered = {
            // --- THIS IS THE FIX ---
            donorListings: listings.filter(l => (l.donor?._id || l.donor) === userProfile._id),
            // Rider sees orders waiting for ANY rider
            availableOrders: orders.filter(o => o.status === 'awaiting_rider'),
            // Rider sees orders they personally accepted AND are picked up
            myActiveOrders: orders.filter(o => o.riderId === userProfile._id && o.status === 'picked_up'),
            // Receiver sees listings available for anyone to claim
            availableListings: listings.filter(l => l.status === 'available'),
            // Receiver sees orders they personally claimed
            receiverOrders: orders.filter(o => o.receiverId === userProfile._id)
        };
        // console.log("User:", userProfile?.role, "Recalculated Data:", filtered); // Debugging
        return filtered;
    }, [listings, orders, userProfile, view]);

    // --- PASTE THE FILTERED LISTINGS useMemo HERE ---
    const filteredListings = useMemo(() => {
        // Get the available listings from dataForCurrentRole
        const allAvailableListings = dataForCurrentRole.availableListings || []; // Add default empty array

        return allAvailableListings.filter(listing => {
            // Dietary Filter
            if (dietaryFilter !== 'all' && listing.veg !== dietaryFilter) {
                return false;
            }
            // Search Query Filter
            if (nearbySearchQuery.trim() !== '') {
                const query = nearbySearchQuery.toLowerCase();
                const itemMatch = listing.items?.some(item =>
                    item.itemName.toLowerCase().includes(query)
                );
                if (!itemMatch) {
                    return false;
                }
            }
            return true;
        });
        // Dependencies: depends on the main data, search query, and filter state
    }, [dataForCurrentRole.availableListings, nearbySearchQuery, dietaryFilter]);
    // --- END PASTE ---
    // --- UI COMPONENTS ---

    // --- Inside the Annapurna component ---

    // --- REPLACE your existing Header component with THIS code ---

    // --- Inside the Annapurna component ---

    // --- START: REPLACE Existing Header function ---
    const Header = () => {
        // Hide this header if logged out AND on the home view
        if (view === 'home' && !userProfile) {
            return null; // HomePage component renders its own header/nav
        }

        // Determine where the logo/name click should navigate
        const homeTargetView = userProfile ? userProfile.role : 'home'; // Go to user's dashboard if logged in, else home

        return (
            // Header bar styling
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg p-3 sm:p-4 flex justify-between items-center sticky top-0 w-full z-30"> {/* Increased z-index */}

                {/* Logo and Name */}
                <div
                    className="flex items-center cursor-pointer transition-transform transform hover:scale-105" // Added hover effect
                    onClick={() => { setView(homeTargetView); setError(null); }} // Navigate on click
                    title={`Go to ${userProfile ? 'Dashboard' : 'Home'}`} // Tooltip
                >
                    <img src={logo} alt="Annapurna Logo" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover mr-2 shadow-md" />
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Annapurna
                    </h1>
                </div>

                {/* Right side content: User info & Logout */}
                <div className="flex space-x-3 items-center">
                    {/* Display User Name and Role (Optional, uncomment if desired) */}
                    {/* {userProfile && (
                        <div className="hidden md:flex items-baseline space-x-1 text-white text-sm my-auto font-semibold">
                             <span className="text-blue-200">{userProfile.name}</span>
                             <span className="text-gray-300">({userProfile.role.toUpperCase()})</span>
                         </div>
                     )} */}

                    {/* Logout Button (Only shown when logged in) */}
                    {userProfile && (
                        <button
                            onClick={handleLogout} // Call logout function on click
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-full transition duration-300 shadow-md transform hover:scale-105 text-xs sm:text-sm" // Adjusted padding/size
                        >
                            Logout
                        </button>
                    )}

                    {/* Show Login Button if NOT logged in AND NOT on login/register/home views */}
                    {!userProfile && view !== 'login' && !view.startsWith('register') && view !== 'home' && (
                        <button
                            onClick={() => { setView('login'); setError(null); }}
                            className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-full transition duration-300 shadow-md transform hover:scale-105 text-xs sm:text-sm"
                        >
                            Login
                        </button>
                    )}
                </div>
            </div>
        );
    };
    // --- END: REPLACE Existing Header function ---
    // --- REPLACE the old renderDonorView function with this ---

    // --- REPLACE the old renderDonorView function with this ---

    const renderDonorView = () => {
        // --- State and handlers specific to the multi-item form ---
        const handleItemChange = (id, field, value) => {
            setNewDonationItems(prevItems =>
                prevItems.map(item => (item.id === id ? { ...item, [field]: value } : item))
            );
        };
        const addItem = () => { setNewDonationItems(prev => [...prev, { id: Date.now(), itemName: '', quantity: 1, unit: 'servings', ingredients: '' }]); };
        const removeItem = (id) => { setNewDonationItems(prev => prev.filter(item => item.id !== id)); };

        // Simulated function to get total estimated nutrition
        const calculateTotalNutrition = () => {
            let total = { calories: 0, protein: 0, fat: 0 };
            const getNutritionEstimate = (ingredientsString) => { /* Simple simulation */
                if (!ingredientsString) return { calories: 0, protein: 0, fat: 0 };
                const ingredients = ingredientsString.toLowerCase().split(',').map(s => s.trim());
                let itemCals = 0, itemProt = 0, itemFat = 0;
                ingredients.forEach(ing => { /* Simple lookup */
                    if (ing.includes('rice')) { itemCals += 150; itemProt += 3; }
                    else if (ing.includes('chicken') || ing.includes('meat')) { itemCals += 200; itemProt += 30; itemFat += 8; }
                    else if (ing.includes('dal') || ing.includes('beans') || ing.includes('potato')) { itemCals += 100; itemProt += 7; }
                    else if (ing.includes('vegetables') || ing.includes('veg') || ing.includes('spices')) { itemCals += 50; itemProt += 3; }
                    else if (ing.includes('oil') || ing.includes('ghee') || ing.includes('yogurt')) { itemCals += 80; itemFat += 10; }
                });
                const factor = 0.9 + Math.random() * 0.2;
                return { calories: Math.round(itemCals * factor), protein: Math.round(itemProt * factor), fat: Math.round(itemFat * factor) };
            };
            newDonationItems.forEach(item => {
                const estimate = getNutritionEstimate(item.ingredients || item.itemName);
                total.calories += estimate.calories * (Number(item.quantity) || 1);
                total.protein += estimate.protein * (Number(item.quantity) || 1);
                total.fat += estimate.fat * (Number(item.quantity) || 1);
            });
            return total;
        };
        const totalNutritionEstimate = calculateTotalNutrition();

        // --- Data for other tabs ---
        const donorListings = dataForCurrentRole.donorListings;
        const activeListings = donorListings.filter(l => l.status === 'available' || l.status === 'claimed' || l.status === 'picked_up');
        const historyListings = donorListings.filter(l => l.status === 'delivered' || l.status === 'cancelled');

        // --- Premium Styling Classes ---
        const tabClass = "py-3 px-6 font-semibold rounded-t-lg cursor-pointer transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300";
        const activeTabClass = "bg-white text-blue-700 shadow-md border-b-0 border border-gray-200";
        const inactiveTabClass = "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700";
        const cardClass = "bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100";
        const premiumBadgeClass = "absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow";
        // --- Location Selector Modal Component ---

        // -
        return (
            <div className="container mx-auto p-4 md:p-8 pt-24 min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-4">
                    <div><h2 className="text-4xl font-extrabold text-gray-800">Donor Dashboard</h2><p className="text-lg text-gray-600 mt-1">Manage contributions.</p></div>
                    <div className="mt-4 sm:mt-0 relative inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg"><span className="font-semibold">🌟 Valued Donor</span></div>
                </div>
                <div className="mb-8 px-4 border-b border-gray-200">
                    <nav className="flex flex-wrap space-x-1 -mb-px">
                        <button onClick={() => setDonorActiveTab('create')} className={`${tabClass} ${donorActiveTab === 'create' ? activeTabClass : inactiveTabClass}`}>Create</button>
                        <button onClick={() => setDonorActiveTab('active')} className={`${tabClass} ${donorActiveTab === 'active' ? activeTabClass : inactiveTabClass}`}>Active ({activeListings.length})</button>
                        <button onClick={() => setDonorActiveTab('history')} className={`${tabClass} ${donorActiveTab === 'history' ? activeTabClass : inactiveTabClass}`}>History ({historyListings.length})</button>
                    </nav>
                </div>
                <div className="px-4">
                    {donorActiveTab === 'create' && (
                        <AnimatedSection className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className={`${cardClass} lg:col-span-2 relative`}>
                                <span className={premiumBadgeClass}>NEW</span>
                                <h3 className="text-2xl font-bold text-blue-700 mb-6 border-b pb-3">New Donation</h3>
                                {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                                <form onSubmit={(e) => { e.preventDefault(); handleCreateListing(); }} className="space-y-6">
                                    <div><label htmlFor="pickupTime" className="block text-sm font-medium mb-1">Pickup Window</label><input type="text" id="pickupTime" value={newDonationPickupTime} onChange={(e) => setNewDonationPickupTime(e.target.value)} placeholder="e.g., Today 4-6 PM" required className="w-full p-3 border rounded-lg focus:ring-blue-500" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Dietary</label><select value={newDonationVeg} onChange={(e) => setNewDonationVeg(e.target.value)} required className="w-full p-3 border rounded-lg bg-white focus:ring-blue-500"><option value="veg">Veg 🌱</option> <option value="non-veg">Non-Veg 🍖</option> <option value="mixed">Mixed</option></select></div>
                                    <div><label htmlFor="shelfLife" className="block text-sm font-medium mb-1">Good For (Hours) <span className="text-red-500">*</span></label><input type="number" id="shelfLife" value={newDonationShelfLife} onChange={(e) => setNewDonationShelfLife(e.target.value)} min="1" max="48" required placeholder="e.g., 6" className="w-full p-3 border rounded-lg focus:ring-blue-500" /><p className="text-xs text-gray-500 mt-1">Approx hours food stays fresh.</p></div>
                                    <div className="space-y-4"><h4 className="text-lg font-semibold">Items</h4>{newDonationItems.map((item) => (<div key={item.id} className="p-4 border rounded-lg bg-gray-50 relative animate-fade-in"><div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center"><input type="text" placeholder="Item Name" value={item.itemName} onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)} required className="p-2 border rounded md:col-span-2 focus:ring-blue-500" /><div className="flex space-x-2"><input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} required className="p-2 border rounded w-1/2 focus:ring-blue-500" /><select value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="p-2 border rounded w-1/2 bg-white focus:ring-blue-500"><option value="servings">servings</option> <option value="pcs">pcs</option> <option value="kg">kg</option> <option value="ltr">ltr</option> <option value="box">box</option></select></div></div><textarea placeholder="Ingredients (optional)" value={item.ingredients} onChange={(e) => handleItemChange(item.id, 'ingredients', e.target.value)} className="w-full p-2 border rounded mt-2 focus:ring-blue-500" rows="1"></textarea>{newDonationItems.length > 1 && (<button type="button" onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600" aria-label="Remove"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></button>)}</div>))} <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>Add Item</button></div>
                                    {/* --- ADD THIS LOCATION INPUT SECTION --- */}
                                    {/* --- MODIFY THIS LOCATION DISPLAY SECTION --- */}
                                    <div className="mb-4">
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Donation Location:
                                        </label>
                                        {newDonationLocation.addressString ? ( // Check for addressString first
                                            <p className="text-green-700 bg-green-100 p-2 rounded-md text-sm">
                                                <span className="font-semibold">Selected:</span> {newDonationLocation.addressString}
                                                <span className="text-xs text-gray-500 block">(Lat: {newDonationLocation.lat?.toFixed(4)}, Lng: {newDonationLocation.lng?.toFixed(4)})</span>
                                            </p>
                                        ) : newDonationLocation.lat && newDonationLocation.lng ? ( // Fallback for just coords
                                            <p className="text-green-600">Location Set: Lat {newDonationLocation.lat.toFixed(4)}, Lng {newDonationLocation.lng.toFixed(4)}</p>
                                        ) : (
                                            <p className="text-red-500">Location Not Set</p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowLocationModal(true)}
                                            className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                                        >
                                            {newDonationLocation.lat ? 'Change Location' : 'Set Donation Location'}
                                        </button>
                                    </div>
                                    {/* --- END MODIFIED LOCATION DISPLAY --- */}
                                    {/* --- END ADD LOCATION INPUT SECTION --- */}
                                    <button type="submit" disabled={loading || dataLoading} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 rounded-lg disabled:opacity-50"> {loading ? 'Creating...' : 'Submit'} </button>
                                </form>
                            </div>
                            <div className="lg:col-span-1 space-y-6">
                                <div className={`${cardClass} bg-gradient-to-br from-blue-100 to-indigo-100`}>
                                    <h4 className="text-lg font-semibold text-indigo-800 mb-3 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" /></svg>Nutritional Est.</h4>
                                    <p>Cals: <span className="font-bold text-2xl text-blue-800">{totalNutritionEstimate.calories}</span> <span className="text-xs">kcal</span></p>
                                    <p>Prot: <span className="font-bold text-2xl text-green-800">{totalNutritionEstimate.protein}</span> <span className="text-xs">g</span></p>
                                    <p>Fat: <span className="font-bold text-2xl text-orange-800">{totalNutritionEstimate.fat}</span> <span className="text-xs">g</span></p>
                                    <p className="text-xs text-gray-500 mt-2">*Approx. total.</p>
                                </div>
                                <div className={`${cardClass}`}> <h4 className="text-lg font-semibold mb-2">Impact</h4> <div className="space-y-2 text-sm"><p>Total Donations: <span className="font-bold text-blue-600">{donorListings.length}</span></p><p>Completed: <span className="font-bold text-green-600">{historyListings.length}</span></p></div> </div>
                                <div className={`${cardClass}`}> <h4 className="text-lg font-semibold mb-2">Tips</h4> <ul className="list-disc list-inside text-sm space-y-1"><li>Be descriptive.</li><li>Specify ingredients.</li><li>Provide pickup window.</li></ul></div>
                            </div>
                        </AnimatedSection>
                    )}
                    {donorActiveTab === 'active' && (
                        <AnimatedSection className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Active Donations</h3>
                            {dataLoading && activeListings.length === 0 && <p className="animate-pulse">Loading...</p>}
                            {!dataLoading && activeListings.length === 0 && <p>No active donations.</p>}
                            {activeListings.map(listing => (
                                <div key={listing._id} className={`${cardClass} relative grid grid-cols-1 md:grid-cols-4 gap-4 items-start animate-fade-in`}>
                                    {listing.quantity > 5 && <span className={premiumBadgeClass}>High Impact</span>}
                                    <div className="md:col-span-2 space-y-1">
                                        {/* --- NEW, CORRECTED CODE --- */}
                                        {/* Display the name of the first item, or 'Multiple Items' */}
                                        <h4 className="font-bold text-xl text-blue-700">{listing.items?.[0]?.itemName || 'Donation Items'} {listing.items?.length > 1 ? `(+${listing.items.length - 1} more)` : ''}</h4>
                                        <p className="text-xs text-gray-400">Listed: {new Date(listing.createdAt).toLocaleString()}</p>
                                        {/* --- NEW, CORRECTED CODE --- */}
                                        {/* Display each item with its quantity */}
                                        <div className="text-sm pt-1">
                                            <span className="font-semibold">Items:</span>
                                            <ul className="list-disc list-inside ml-4">
                                                {listing.items?.map((item, index) => (
                                                    <li key={item.id || index}>
                                                        {item.itemName} ({item.quantity} {item.unit})
                                                    </li>
                                                )) || <li>N/A</li>}
                                            </ul>
                                        </div>
                                        {/* --- END CORRECTED CODE --- */}{/* --- END CORRECTED CODE --- */}
                                        <p className="text-sm"><span className="font-semibold">Pickup:</span> {listing.pickupTimeWindow || 'ASAP'}</p>
                                        <p className="text-sm font-semibold text-red-600"><span className="font-semibold text-gray-700">Good For:</span> ~{listing.shelfLifeHours} hrs</p>
                                        <div className="mt-2 text-xs bg-blue-50 p-2 rounded border inline-block"><p className="font-semibold text-blue-700">Est. Nutri:</p><p>C:{listing.nutritionalData?.calories} P:{listing.nutritionalData?.protein}g F:{listing.nutritionalData?.fat}g</p></div>
                                    </div>
                                    <div className="md:col-span-1 text-sm space-y-1">
                                        <p className="font-semibold mb-1">Status:</p>
                                        <span className={`inline-block px-3 py-1 font-semibold rounded-full text-xs ${listing.status === 'available' ? 'bg-green-100 text-green-800 ring-1 ring-green-300' : listing.status === 'claimed' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' : 'bg-orange-100 text-orange-800 ring-1 ring-orange-300'}`}> {listing.status.replace('_', ' ').toUpperCase()} </span>
                                        {(listing.status === 'claimed' || listing.status === 'picked_up') && (() => {
                                            const order = orders.find(o => o.listingId?._id === listing._id);
                                            return order?.riderName ? (<div className="mt-3"><p className="font-semibold">Rider:</p><p>{order.riderName}</p></div>) : <p className="mt-3 text-gray-500 animate-pulse">Awaiting Rider...</p>;
                                        })()
                                        }
                                    </div>
                                    <div className="md:col-span-1 flex flex-col space-y-2 items-stretch md:items-end mt-4 md:mt-0">
                                        {listing.status === 'available' && (<>
                                            <button onClick={() => handleStartEdit(listing)} className="text-xs bg-gray-200 hover:bg-gray-300 py-1.5 px-3 rounded-full w-full text-center">Edit</button>
                                            <button onClick={() => handleDeleteListing(listing._id)} disabled={loading} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1.5 px-3 rounded-full w-full text-center disabled:opacity-50">Delete</button>
                                        </>)}
                                        {listing.status === 'claimed' && (<button className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1.5 px-3 rounded-full w-full text-center">Mark Ready</button>)}
                                        {listing.status === 'picked_up' && (<p className="text-xs text-orange-600 font-medium text-right mt-2">En route...</p>)}
                                        <p className="text-xs text-gray-400 mt-2 text-right">ID: ...{listing._id.substring(listing._id.length - 6)}</p>
                                    </div>
                                </div>
                            ))}
                        </AnimatedSection>
                    )}
                    {donorActiveTab === 'history' && (
                        <AnimatedSection className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">Past Donations</h3>
                            {dataLoading && historyListings.length === 0 && <p className="animate-pulse">Loading...</p>}
                            {!dataLoading && historyListings.length === 0 && <p>No history found.</p>}
                            {historyListings.map(listing => (
                                <div key={listing._id} className={`${cardClass} opacity-90 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in`}>
                                    <div className="md:col-span-2">
                                        <h4 className="font-bold text-lg text-gray-700">{listing.foodItem}</h4>
                                        <p className="text-sm text-gray-500">Completed: {listing.updatedAt ? new Date(listing.updatedAt).toLocaleString() : 'N/A'}</p>
                                        <p className="text-sm mt-1">{listing.quantity} servings | {listing.veg === 'veg' ? 'Veg 🌱' : 'Non-Veg 🍖'}</p>
                                    </div>
                                    <div className="md:col-span-1 text-left md:text-right">
                                        <p className="text-sm font-semibold text-gray-600">Final Rating:</p>
                                        <p className="text-xl font-bold text-green-600">{listing.ratingAvg ? `${listing.ratingAvg.toFixed(1)} ★` : 'Not Rated'}</p>
                                    </div>
                                </div>
                            ))}
                        </AnimatedSection>
                    )}
                </div>
            </div>
        );
    };
    // --- END of new renderDonorView function ---




    const renderReceiverView = () => {

        const myClaims = dataForCurrentRole.receiverOrders;
        const selectedListing = receiverSelectedListing;
        const setSelectedListing = setReceiverSelectedListing;
        const ratingForm = receiverRatingForm;
        const setRatingForm = setReceiverRatingForm;
        const handleRatingChange = (e) => setRatingForm({ ...ratingForm, [e.target.name]: e.target.value });
        const submitRating = (listingId) => { handleRatingSubmission(listingId, parseInt(ratingForm.rating), ratingForm.review); };
        const allAvailableListings = dataForCurrentRole.availableListings; // Get all listings first
        // --- ListingCard with TIMER within renderReceiverView ---
        // --- FINAL ListingCard with TIMER, DISTANCE & HOVER within renderReceiverView ---
        // --- Updated ListingCard Design ---
        // --- FINAL ListingCard with All Info ---


        // Apply filters


        // Use the filtered list for display
        const availableFood = filteredListings;
        const ListingCard = ({ listing }) => {
            // State and Effects for Timer and Distance
            const [timeLeft, setTimeLeft] = useState('Calculating...');
            const [isExpired, setIsExpired] = useState(false);
            const [distance, setDistance] = useState(null);

            // --- Timer Effect ---
            useEffect(() => {
                if (!listing.createdAt || typeof listing.shelfLifeHours !== 'number' || listing.shelfLifeHours <= 0) {
                    console.error('Timer Error: Invalid createdAt or shelfLifeHours for listing', listing._id); setTimeLeft('Invalid Data'); setIsExpired(true); return;
                }
                let timerId = null;
                const calculateRemainingTime = () => {
                    const expirationTime = new Date(listing.createdAt).getTime() + (listing.shelfLifeHours * 60 * 60 * 1000);
                    const now = new Date().getTime(); const difference = expirationTime - now;
                    if (difference <= 0) { setTimeLeft('Expired'); setIsExpired(true); if (timerId) clearInterval(timerId); return; }
                    const hours = Math.floor(difference / (1000 * 60 * 60)); const minutes = Math.floor((difference / (1000 * 60)) % 60); const seconds = Math.floor((difference / 1000) % 60);
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`); setIsExpired(false);
                };
                calculateRemainingTime();
                if (new Date(listing.createdAt).getTime() + (listing.shelfLifeHours * 60 * 60 * 1000) > new Date().getTime()) { timerId = setInterval(calculateRemainingTime, 1000); }
                return () => { if (timerId) clearInterval(timerId); };
            }, [listing.createdAt, listing.shelfLifeHours, listing._id]);

            // --- Distance Effect ---
            useEffect(() => {
                if (receiverLocation.lat && receiverLocation.lng && listing.location?.coordinates && listing.location.coordinates.length === 2) {
                    const listingLat = listing.location.coordinates[1]; const listingLng = listing.location.coordinates[0];
                    const distKm = getDistanceFromLatLonInKm(receiverLocation.lat, receiverLocation.lng, listingLat, listingLng);
                    setDistance(distKm);
                } else { setDistance(null); }
            }, [receiverLocation, listing.location, listing._id]);

            // --- Safely access data for display ---
            const firstItemName = listing.items?.[0]?.itemName || 'Food Item';
            const donorName = listing.donor?.name || 'Unknown Donor';
            const donorAvgRating = listing.donor?.avgRating;
            const pickupAddress = listing.address || 'Address not specified'; // Ensure this uses listing.address

            // --- Hover Handlers ---
            const handleMouseEnter = () => {
                setHoveredListingId(listing._id);
                if (receiverLocation.lat && receiverLocation.lng && listing.location?.coordinates && listing.location.coordinates.length === 2) {
                    const startPoint = [receiverLocation.lat, receiverLocation.lng];
                    const endPoint = [listing.location.coordinates[1], listing.location.coordinates[0]];
                    setRouteLinePositions([startPoint, endPoint]);
                }
            };
            const handleMouseLeave = () => { setHoveredListingId(null); setRouteLinePositions([]); };

            // --- JSX Return ---
            return (
                <div
                    className={`bg-white p-4 rounded-lg shadow-md border ${hoveredListingId === listing._id ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'} ${isExpired ? 'opacity-60' : ''} hover:shadow-lg transition duration-200 cursor-pointer animate-fade-in`}
                    onClick={() => setSelectedListing(listing)}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Top Section: Title & Timer */}
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-md sm:text-lg text-gray-800 mr-2 flex-grow">{firstItemName} {listing.items?.length > 1 ? `(+${listing.items.length - 1})` : ''} <span className="text-sm font-normal">({listing.veg === 'veg' ? '🌱' : listing.veg === 'non-veg' ? '🍖' : '🍲'})</span></h4>
                        <div className={`whitespace-nowrap font-semibold text-xs px-2 py-0.5 rounded-full ${isExpired ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'}`}>
                            ⏳ {isExpired ? 'Expired' : timeLeft}
                        </div>
                    </div>

                    {/* Donor Info */}
                    <div className="text-gray-600 text-xs mb-2 border-t pt-2 mt-2">
                        <span>From: <span className="font-semibold text-gray-700">{donorName}</span></span>
                        <span className="ml-2"> | Rating:
                            <span className="font-semibold text-amber-600 ml-1">
                                {donorAvgRating ? `${donorAvgRating.toFixed(1)} ★` : 'N/A'}
                            </span>
                        </span>
                    </div>

                    {/* --- Food Items List (Restored) --- */}
                    <div className="text-xs my-2">
                        <span className="font-semibold text-gray-700">Items Included:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5"> {/* Added space-y */}
                            {listing.items?.map((item, index) => (
                                <li key={item.id || index} className="text-gray-600">
                                    {item.itemName} ({item.quantity} {item.unit})
                                </li>
                            )) || <li className="text-gray-400">Details unavailable</li>}
                        </ul>
                    </div>
                    {/* --- End Items List --- */}

                    {/* Address & Distance */}
                    <p className="text-xs text-gray-500 mt-2 line-clamp-1" title={pickupAddress}>📍 <span className="font-medium text-gray-700">Pickup:</span> {pickupAddress}</p>
                    {distance !== null ? (
                        <p className="text-xs font-semibold text-indigo-600 mt-1">~ {distance.toFixed(1)} km away</p>
                    ) : (!receiverLocation.lat && <p className="text-xs text-gray-400 mt-1">Set location for distance</p>)}


                    {/* Nutrition Badge */}
                    <div className="mt-3 text-xs bg-blue-50 p-1 px-2 rounded border inline-block">
                        <span className="font-semibold text-blue-700">Nutrition (Est. Total):</span> Cal: {listing.nutritionalData?.calories || '?'} | Prot: {listing.nutritionalData?.protein || '?'}g
                    </div>
                </div>
            );
        };
        // --- END FINAL ListingCard ---L ListingCard ---
        // --- END ListingCard with TIMER ---
        // --- END ENHANCED ListingCard ---
        const Modal = () => {
            if (!selectedListing) return null;
            // Ensure listingId is populated before accessing nested properties
            const myOrder = myClaims.find(o => o.listingId?._id === selectedListing._id);
            const isDelivered = myOrder && myOrder.status === 'delivered';
            const hasRated = selectedListing.ratings.some(r => r.reviewerId === userProfile?._id);

            return (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl max-w-lg w-full shadow-2xl">
                        <h3 className="text-2xl font-bold text-blue-600 mb-4">{selectedListing.foodItem}</h3>
                        <p className="text-sm mb-2">Donor: <span className="font-semibold">{selectedListing.donorName}</span> | Pickup: <span className="font-semibold">{selectedListing.address}</span></p>
                        <p className="mb-4 font-semibold">Status:
                            <span className={myOrder ? (myOrder.status === 'delivered' ? 'text-green-600' : 'text-yellow-600') : 'text-green-600'}>
                                {myOrder ? myOrder.status.toUpperCase().replace('_', ' ') : selectedListing.status.toUpperCase()}
                            </span>
                        </p>
                        <div className="bg-blue-100 p-3 rounded-lg mb-4">
                            <h4 className="font-semibold text-blue-700">Nutritional Estimate</h4>
                            <p className="text-sm"><b>Ingredients:</b> {selectedListing.ingredients}</p>
                            <p className="text-sm">Cal: <span className="font-semibold">{selectedListing.nutritionalData?.calories}</span> | Prot: <span className="font-semibold">{selectedListing.nutritionalData?.protein}g</span> | Fat: <span className="font-semibold">{selectedListing.nutritionalData?.fat}g</span></p>
                        </div>
                        {myOrder && <p className="text-sm mb-2"><b>Fee:</b> ₹{myOrder.totalFee || 'Pending'}</p>}
                        {selectedListing.status === 'available' && !myOrder && (
                            <button onClick={() => handleClaimFood(selectedListing._id)} disabled={loading || dataLoading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold disabled:opacity-50">
                                {loading ? 'Claiming...' : 'CLAIM FOOD'}
                            </button>
                        )}
                        {isDelivered && !hasRated && (
                            <div className="mt-4 border-t pt-4">
                                <h4 className="font-bold mb-2">Rate Donation</h4>
                                <form onSubmit={(e) => { e.preventDefault(); submitRating(selectedListing._id); }} className="space-y-3">
                                    <label className="block">Rating:
                                        <select name="rating" value={ratingForm.rating} onChange={handleRatingChange} className="w-full p-2 border rounded-lg">
                                            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                        </select>
                                    </label>
                                    <textarea name="review" placeholder="Review..." value={ratingForm.review} onChange={handleRatingChange} className="w-full p-2 border rounded-lg" rows="2"></textarea>
                                    <button type="submit" disabled={loading || dataLoading} className="w-full bg-blue-500 text-white py-2 rounded-lg disabled:opacity-50">
                                        {loading ? 'Submitting...' : 'Submit Rating'}
                                    </button>
                                </form>
                            </div>
                        )}
                        {isDelivered && hasRated && <p className="mt-4 text-center text-green-600 font-bold">Rated!</p>}
                        <button onClick={() => setSelectedListing(null)} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-800">Close</button>
                    </div>
                </div>
            );
        };

        // --- START: New return statement for renderReceiverView ---
        return (
            // Main container with background and padding
            <div className="container mx-auto px-4 py-8 pt-24 min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100">
                {Modal()} {/* Keep the modal render call */}

                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-2">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800">Receiver Hub</h2>
                        <p className="text-md text-gray-600 mt-1">Find and claim available food donations near you.</p>
                    </div>
                    {/* Optional: Add receiver-specific info/badge here if needed */}
                </div>

                {/* Main Content Area - Two Columns */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

                    {/* --- Left Column (Map & Order Status) --- */}
                    <div className="lg:w-2/3 space-y-6"> {/* Takes 2/3 width on large screens */}
                        {/* Map Section */}
                        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Live Food Map
                            </h3>
                            <div className="h-96 w-full rounded-lg overflow-hidden relative z-10 border border-gray-200"> {/* Ensure map height and border */}
                                <MapContainer
                                    center={[13.6288, 79.4192]} // Centered on Tirupati
                                    zoom={13}
                                    scrollWheelZoom={true}
                                    style={{ height: '100%', width: '100%' }} // Map takes full height of container
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {/* Markers loop */}
                                    {availableFood.map(listing => {
                                        if (!listing.location?.coordinates || listing.location.coordinates.length !== 2) return null;
                                        const position = [listing.location.coordinates[1], listing.location.coordinates[0]];
                                        if (typeof position[0] !== 'number' || typeof position[1] !== 'number') return null;
                                        return (
                                            <Marker key={listing._id} position={position}>
                                                <Popup>
                                                    {/* Keep existing popup content */}
                                                    <div className="font-sans text-sm">
                                                        <h4 className="font-bold text-md mb-1">{listing.items?.[0]?.itemName || 'Food Item'} {listing.items?.length > 1 ? `(+${listing.items.length - 1})` : ''}</h4>
                                                        <p className="mb-1">{listing.items?.length || 0} item(s). ({listing.veg === 'veg' ? '🌱' : listing.veg === 'non-veg' ? '🍖' : '🍲'})</p>
                                                        <p className="text-xs text-gray-600 mb-2">From: {listing.donor?.name || 'Unknown'}</p>
                                                        <button onClick={() => setSelectedListing(listing)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded-lg font-bold text-xs transition duration-200">View & Claim</button>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                    {/* Polyline for Hover Route */}
                                    {routeLinePositions.length === 2 && /* ... checks ... */ (
                                        <Polyline positions={routeLinePositions} pathOptions={{ color: 'red', weight: 3, opacity: 0.7 }} />
                                    )}
                                </MapContainer>
                            </div>
                        </section>

                        {/* Order Status Section */}
                        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Your Claimed Orders
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2"> {/* Added max height and scroll */}
                                {dataLoading && myClaims.length === 0 && <p className="text-gray-500 animate-pulse text-sm">Loading your orders...</p>}
                                {!dataLoading && myClaims.length === 0 && <p className="text-gray-500 text-sm">You haven't claimed any food yet.</p>}
                                {myClaims.map(order => {
                                    const listingDetails = order.listingId || { items: [{ itemName: 'Unknown Item' }] }; // Safer default
                                    const firstItemName = listingDetails.items?.[0]?.itemName || 'Food Item';
                                    return (
                                        <div key={order._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3 animate-fade-in">
                                            <div>
                                                <h4 className="font-bold text-md text-gray-700">{firstItemName} {listingDetails.items?.length > 1 ? `(+${listingDetails.items.length - 1})` : ''}</h4>
                                                <p className="text-gray-600 text-xs mt-1">From: {listingDetails.donor?.name || 'Unknown'} | Rider: {order.riderName || 'Pending'}</p>
                                                <p className="text-xs text-gray-500 mt-1">Fee: ₹{order.totalFee || 'N/A'}</p>
                                            </div>
                                            <div className="flex flex-col items-start sm:items-end gap-1">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${order.status === 'awaiting_rider' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300' :
                                                    order.status === 'picked_up' ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-300' :
                                                        order.status === 'delivered' ? 'bg-green-100 text-green-800 ring-1 ring-green-300' : 'bg-gray-100 text-gray-800 ring-1 ring-gray-300'
                                                    }`}>
                                                    {order.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                                {order.status === 'delivered' && (
                                                    <button
                                                        onClick={() => {
                                                            const fullListing = listings.find(l => l._id === listingDetails._id);
                                                            if (fullListing) setSelectedListing(fullListing);
                                                        }}
                                                        className="text-xs text-blue-600 hover:underline mt-1"
                                                    >
                                                        Rate/View Details
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* --- Right Column (Nearby Listings) --- */}
                    <div className="lg:w-1/3"> {/* Takes 1/3 width on large screens */}
                        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100 lg:sticky lg:top-24"> {/* Sticky sidebar on large screens */}
                            {/* Header with Set Location Button */}
                            {/* <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Nearby Listings ({availableFood.length})
                                </h3>
                                <button
                                    onClick={() => setShowReceiverLocationModal(true)}
                                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-1.5 px-3 rounded-full flex items-center transition duration-200"
                                    title={receiverLocation.addressString || 'Set location for distance'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {receiverLocation.lat ? 'Change' : 'Set Location'}
                                </button>
                            </div> */}
                            {/* --- NEW Right Column Header with Filters --- */}

                            <div className="mb-4 pb-3 border-b border-gray-200">

                                {/* Title and Location Button */}

                                <div className="flex justify-between items-center mb-3">

                                    <h3 className="text-xl font-bold text-gray-800 flex items-center">

                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>

                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />

                                        </svg>

                                        Nearby Listings {/* Count will be added later */}

                                    </h3>

                                    <button

                                        onClick={() => setShowReceiverLocationModal(true)}

                                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-1.5 px-3 rounded-full flex items-center transition duration-200"

                                        title={receiverLocation.addressString || 'Set location for distance'}

                                    >

                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

                                        {receiverLocation.lat ? 'Change' : 'Set Location'}

                                    </button>

                                </div>



                                {/* Search Bar */}

                                <div className="relative mb-3">

                                    <input

                                        type="text"

                                        placeholder="Search by item name..."

                                        value={nearbySearchQuery}

                                        onChange={(e) => setNearbySearchQuery(e.target.value)}

                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-blue-500 focus:border-blue-500 text-sm"

                                    />

                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">

                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">

                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />

                                        </svg>

                                    </div>

                                </div>



                                {/* Dietary Filters */}

                                <div className="flex space-x-2">

                                    <button

                                        onClick={() => setDietaryFilter('all')}

                                        className={`flex-1 py-1 px-3 rounded-full text-xs font-semibold transition duration-200 ${dietaryFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}

                                    >All</button>

                                    <button

                                        onClick={() => setDietaryFilter('veg')}

                                        className={`flex-1 py-1 px-3 rounded-full text-xs font-semibold transition duration-200 ${dietaryFilter === 'veg' ? 'bg-green-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}

                                    >Veg 🌱</button>

                                    <button

                                        onClick={() => setDietaryFilter('non-veg')}

                                        className={`flex-1 py-1 px-3 rounded-full text-xs font-semibold transition duration-200 ${dietaryFilter === 'non-veg' ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}

                                    >Non-Veg 🍖</button>

                                </div>

                            </div>
                            {/* Listings List */}
                            {dataLoading && listings.length === 0 && <p className="text-gray-500 animate-pulse text-sm">Loading listings...</p>}
                            {!dataLoading && availableFood.length === 0 && <p className="text-gray-500 text-sm">No food available nearby.</p>}
                            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar"> {/* Scrollable list */}
                                {availableFood.map(listing => <ListingCard key={listing._id} listing={listing} />)}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
        // --- END: New return statement for renderReceiverView ---
    };

    const renderRiderView = () => {
        // --- MODIFY Data Filtering ---
        const allUserOrders = dataForCurrentRole.myActiveOrders; // This name is misleading, it gets ALL orders for the rider
        const availableOrdersForPickup = dataForCurrentRole.availableOrders; // Orders waiting for ANY rider

        // Separate orders based on status for THIS rider
        const myActiveDeliveries = allUserOrders.filter(o => o.riderId === userProfile._id && o.status === 'picked_up');
        const myCompletedDeliveries = allUserOrders.filter(o => o.riderId === userProfile._id && o.status === 'delivered');

        // Calculate potential earnings (sum riderPayout from active and completed)
        const totalEarnings = [...myActiveDeliveries, ...myCompletedDeliveries].reduce((sum, order) => sum + (order.riderPayout || 0), 0);
        // --- END Data Filtering ---
        const availableOrders = dataForCurrentRole.availableOrders;
        const myActiveOrders = dataForCurrentRole.myActiveOrders;

        const OrderCard = ({ order, isAvailable }) => {
            const totalFee = order.totalFee || 60;
            const riderPayout = order.riderPayout || Math.round(totalFee * 0.8);
            const annapurnaCommission = order.annapurnaCommission || Math.round(totalFee * 0.2);
            const listing = order.listingId;

            if (!listing) {
                console.warn("Order missing listing data:", order._id);
                return <div className="bg-red-100 p-2 rounded text-red-700 text-sm">Error: Order data incomplete.</div>;
            }

            return (
                <div key={order._id} className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-400">
                    <h4 className="font-bold text-lg">{listing.foodItem} ({listing.quantity} servings)</h4>
                    <p className="text-gray-600 text-sm">P/U: <span className="font-semibold">{listing.address}</span></p>
                    <p className="text-gray-600 text-sm">D/O: <span className="font-semibold">{order.receiverAddress}</span></p>
                    {isAvailable ? (
                        <>
                            <p className="text-sm font-semibold text-green-600 my-2">Est. Payout: ₹{riderPayout}</p>
                            <button onClick={() => handleRiderAccept(order._id)} disabled={loading || dataLoading} className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg font-bold disabled:opacity-50">
                                {loading ? 'Accepting...' : 'ACCEPT & PICK UP'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-orange-600 my-2">Status: {order.status.toUpperCase()}</p>
                            <p className="text-xs text-gray-500">Fee: ₹{totalFee} | Annapurna: ₹{annapurnaCommission}, You: ₹{riderPayout}</p>
                            <button onClick={() => handleDeliveryComplete(order._id)} disabled={loading || dataLoading} className="mt-3 w-full bg-green-700 text-white py-2 rounded-lg font-bold disabled:opacity-50">
                                {loading ? 'Completing...' : 'COMPLETE DELIVERY'}
                            </button>
                        </>
                    )}
                </div>
            );
        };

        return (
            // Main container with background and padding
            <div className="container mx-auto px-4 py-8 pt-24 min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-100">

                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-2">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800">Rider Dashboard</h2>
                        <p className="text-md text-gray-600 mt-1">Manage deliveries and track earnings.</p>
                    </div>
                    {/* Optional Rider Badge */}
                    <div className="mt-4 sm:mt-0 relative inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg shadow-lg">
                        <span className="font-semibold">🚀 Annapurna Rider</span>
                    </div>
                </div>

                {/* Main Content Area - Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                    {/* --- Left Column (Earnings & Active Delivery) --- */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Earnings Summary Card */}
                        <section className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-24"> {/* Sticky on large screens */}
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Earnings Summary
                            </h3>
                            <div className="text-center bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800 font-medium">Total Potential Earnings</p>
                                <p className="text-4xl font-extrabold text-green-700 mt-1">₹{totalEarnings.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 mt-2">(Based on {myActiveDeliveries.length} active & {myCompletedDeliveries.length} completed deliveries)</p>
                            </div>
                        </section>

                        {/* Active Delivery Card */}
                        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-orange-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Your Active Delivery ({myActiveDeliveries.length})
                            </h3>
                            <div className="space-y-4">
                                {dataLoading && myActiveDeliveries.length === 0 && <p className="text-gray-500 animate-pulse text-sm">Loading...</p>}
                                {!dataLoading && myActiveDeliveries.length === 0 && <p className="text-gray-500 text-sm">No active deliveries right now.</p>}
                                {myActiveDeliveries.map(order => <OrderCard key={order._id} order={order} isAvailable={false} />)}
                            </div>
                        </section>
                    </div>

                    {/* --- Right Column (Available Orders & History) --- */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Available Orders Section */}
                        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Available Orders ({availableOrdersForPickup.length})
                            </h3>
                            {dataLoading && availableOrdersForPickup.length === 0 && <p className="text-gray-500 animate-pulse text-sm">Loading available orders...</p>}
                            {!dataLoading && availableOrdersForPickup.length === 0 && <p className="text-gray-500 text-sm">No orders available for pickup nearby.</p>}
                            {/* Grid layout for available orders */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {availableOrdersForPickup.map(order => <OrderCard key={order._id} order={order} isAvailable={true} />)}
                            </div>
                        </section>

                        {/* Delivery History Section */}
                        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Delivery History ({myCompletedDeliveries.length})
                            </h3>
                            {dataLoading && myCompletedDeliveries.length === 0 && <p className="text-gray-500 animate-pulse text-sm">Loading history...</p>}
                            {!dataLoading && myCompletedDeliveries.length === 0 && <p className="text-gray-500 text-sm">You haven't completed any deliveries yet.</p>}
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {myCompletedDeliveries.map(order => {
                                    const listingDetails = order.listingId || { items: [{ itemName: 'Unknown Item' }] };
                                    const firstItemName = listingDetails.items?.[0]?.itemName || 'Food Item';
                                    return (
                                        <div key={order._id} className="bg-gray-100 p-3 rounded-lg border border-gray-200 opacity-80 flex flex-col sm:flex-row justify-between sm:items-center gap-2 animate-fade-in">
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-700">{firstItemName} {listingDetails.items?.length > 1 ? `(+${listingDetails.items.length - 1})` : ''}</h4>
                                                <p className="text-gray-500 text-xs mt-1">To: {order.receiverName} | P/U: {listingDetails.address}</p>
                                                <p className="text-xs text-gray-500">Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-600">₹{order.riderPayout?.toFixed(2) || '0.00'}</p>
                                                <p className="text-xs text-gray-400">Earned</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
        // --- END: New return statement for renderRiderView ---
    };

    // --- Inside the Annapurna component ---

    const renderHomeView = () => (
        // Simply render the new HomePage component, passing the setView function
        <HomePage setView={setView} />
    );

    // --- REPLACE your existing renderView function with THIS code ---

    const renderView = () => {
        // Show the critical connection error ONLY if the initial load failed
        if (initialLoadError) {
            return (<div className="flex items-center justify-center min-h-screen"><div className="text-center p-8 bg-red-100 rounded-xl shadow-xl border-red-500 border-2"><p className="text-xl font-bold text-red-700">CONNECTION FAILED: START BACKEND!</p><p className="mt-4 text-gray-600">Open terminal, go to `annapurna-backend`, run: `node server.js`</p></div></div>);
        }

        // Show loading state while connecting initially OR during polling if no data exists yet
        if ((!isBackendConnected || dataLoading) && listings.length === 0 && orders.length === 0 && view !== 'home') {
            return (<div className="flex items-center justify-center min-h-screen"><p className="text-xl font-semibold animate-pulse text-gray-500">Loading Annapurna Data...</p></div>)
        }

        switch (view) {
            case 'donor': return renderDonorView();
            case 'receiver': return renderReceiverView();
            case 'rider': return renderRiderView();
            case 'registerdonor':
            case 'registerreceiver':
            case 'registerrider':
                const role = view.replace('register', '');
                return (<div className="flex items-center justify-center min-h-screen bg-gray-50 pt-16">
                    <AuthForm
                        title={`Register as ${role.toUpperCase()}`}
                        action={handleRegister}
                        isRegister={true}
                        role={role}
                        loading={loading}
                        networkError={error}
                        setView={setView}
                    />
                </div>);
            case 'login':
                return (<div className="flex items-center justify-center min-h-screen bg-gray-50 pt-16">
                    <AuthForm
                        title="Login"
                        action={handleLogin}
                        isRegister={false}
                        loading={loading}
                        networkError={error}
                        setView={setView}
                    />
                </div>);
            case 'home':
            default: return renderHomeView();
        }
    };
    // --- END OF UPDATED renderView function ---

    return (
        <div className="min-h-screen bg-gray-50 font-sans animate-fade-in">
            <Header /> {/* <-- ENSURE THIS LINE IS HERE */}
            <main className="pb-8">
                {/* --- ADD THIS MODAL RENDER CALL --- */}
                <LocationSelectorModal
                    isOpen={showLocationModal} // Controls whether the modal is visible (from Annapurna's state)
                    onClose={() => setShowLocationModal(false)} // Function to close the modal
                    onLocationSelect={setNewDonationLocation} // Function to pass selected location back to Annapurna's state
                />
                {/* --- END MODAL RENDER CALL --- */}
                {/* --- ADD THIS MODAL FOR RECEIVER --- */}

                <LocationSelectorModal
                    isOpen={showReceiverLocationModal} // Use the new state variable
                    onClose={() => setShowReceiverLocationModal(false)} // Use the new setter
                    onLocationSelect={setReceiverLocation} // Update the receiver's location state
                />
                {/* --- END ADD --- */}

                {renderView()}
            </main>

            <footer className="text-center p-4 text-xs text-gray-400 border-t mt-8">
                Annapurna Hackathon Project - {new Date().getFullYear()}
            </footer>
        </div>
    );
    // --- Location Selector Modal Component (Place this OUTSIDE the Annapurna function,
    //     e.g., near the bottom of Annapurna.jsx, before the 'export default' line) ---



    // --- END Location Selector Modal Component ---
};

export default Annapurna;

// Basic fade-in animation (add this to your index.css or tailwind config)
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
// .animate-fade-in { animation: fadeIn 0.5s ease-out; }

