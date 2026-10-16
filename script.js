const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const locationButton = document.getElementById("locationButton");
const message = document.getElementById("message");
const weatherSection = document.getElementById("weatherSection");

const weatherDescriptions = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Moderate drizzle", "🌦️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Freezing drizzle", "🌧️"],
    57: ["Heavy freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Moderate rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Light snowfall", "🌨️"],
    73: ["Moderate snowfall", "🌨️"],
    75: ["Heavy snowfall", "❄️"],
    77: ["Snow grains", "❄️"],
    80: ["Light rain showers", "🌦️"],
    81: ["Moderate rain showers", "🌧️"],
    82: ["Violent rain showers", "⛈️"],
    85: ["Snow showers", "🌨️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️"],
    99: ["Severe thunderstorm with hail", "⛈️"]
};

function getWeather(code) {
    return weatherDescriptions[code] || ["Weather unavailable", "🌡️"];
}

function showMessage(text) {
    message.textContent = text;
}

function setLoading(isLoading) {
    searchButton.disabled = isLoading;
    locationButton.disabled = isLoading;
    searchButton.textContent = isLoading ? "Loading..." : "Search";
}

async function getJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("The weather service returned an error.");
    }

    return response.json();
}

// Search a city and convert its name to coordinates.
async function searchCity(city) {
    const url = new URL(GEO_BASE);

    url.search = new URLSearchParams({
        name: city,
        count: "1",
        language: "en",
        format: "json"
    });

    const data = await getJSON(url);

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Check the spelling and try again.");
    }

    const place = data.results[0];

    return {
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        country: place.country || "",
        timezone: place.timezone
    };
}

// Get weather data using latitude and longitude.
async function getWeatherData(place) {
    const url = new URL(API_BASE);

    url.search = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "weather_code",
            "wind_speed_10m"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "sunrise",
            "sunset"
        ].join(","),
        timezone: "auto",
        forecast_days: "5"
    });

    const data = await getJSON(url);

    renderWeather(place, data);
}

// Display the weather on the website.
function renderWeather(place, data) {
    const current = data.current;
    const daily = data.daily;
    const [description, icon] = getWeather(current.weather_code);

    document.getElementById("locationName").textContent =
        [place.name, place.country].filter(Boolean).join(", ");

    const localDate = new Date(current.time);

    document.getElementById("localTime").textContent =
        "Local time: " + localDate.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });

    document.getElementById("weatherDescription").textContent = description;
    document.getElementById("weatherIcon").textContent = icon;
    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m);

    document.getElementById("feelsLike").textContent =
        Math.round(current.apparent_temperature);

    document.getElementById("humidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("wind").textContent =
        current.wind_speed_10m + " km/h";

    document.getElementById("precipitation").textContent =
        current.precipitation + " mm";

    document.getElementById("todayHigh").textContent =
        Math.round(daily.temperature_2m_max[0]);

    document.getElementById("todayLow").textContent =
        Math.round(daily.temperature_2m_min[0]);

    const sunrise = new Date(daily.sunrise[0]);
    const sunset = new Date(daily.sunset[0]);

    document.getElementById("daylight").textContent =
        sunrise.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        }) + " – " + sunset.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    const forecast = document.getElementById("forecast");
    forecast.replaceChildren();

    daily.time.forEach((date, index) => {
        const [dayDescription, dayIcon] =
            getWeather(daily.weather_code[index]);

        const card = document.createElement("article");
        card.className = "forecast-card";

        const day = index === 0
            ? "Today"
            : new Date(date + "T12:00:00").toLocaleDateString(
                "en-US",
                { weekday: "short" }
            );

        // Use textContent so displayed API data is treated as text.
        const dayLabel = document.createElement("p");
        dayLabel.className = "forecast-day";
        dayLabel.textContent = day;

        const iconElement = document.createElement("div");
        iconElement.className = "forecast-icon";
        iconElement.textContent = dayIcon;

        const condition = document.createElement("p");
        condition.className = "forecast-condition";
        condition.textContent = dayDescription;

        const temperatures = document.createElement("div");
        temperatures.className = "forecast-temperatures";

        const high = document.createElement("span");
        high.textContent =
            Math.round(daily.temperature_2m_max[index]) + "°";

        const low = document.createElement("span");
        low.textContent =
            Math.round(daily.temperature_2m_min[index]) + "°";

        temperatures.append(high, low);
        card.append(dayLabel, iconElement, condition, temperatures);
        forecast.appendChild(card);
    });

    weatherSection.hidden = false;
}

// Search form event.
searchForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        showMessage("Please enter a city name.");
        return;
    }

    setLoading(true);
    showMessage("Searching for " + city + "...");

    try {
        const place = await searchCity(city);
        await getWeatherData(place);
        showMessage("Weather updated successfully.");
    } catch (error) {
        showMessage(error.message || "Unable to load weather.");
    } finally {
        setLoading(false);
    }
});

// Detect the current location using browser permission.
locationButton.addEventListener("click", function () {
    if (!navigator.geolocation) {
        showMessage("Your browser does not support geolocation.");
        return;
    }

    setLoading(true);
    showMessage("Requesting your location permission...");

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            try {
                const place = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    name: "Your current location",
                    country: ""
                };

                // Fetch weather for the detected coordinates.
                // Then use the reverse-geocoding service to find its name.
                try {
                    const reverseURL = new URL(GEO_BASE.replace(
                        "/search", "/reverse"
                    ));

                    reverseURL.search = new URLSearchParams({
                        latitude: String(place.latitude),
                        longitude: String(place.longitude),
                        language: "en",
                        format: "json"
                    });

                    const reverseData = await getJSON(reverseURL);

                    if (reverseData.results?.length) {
                        place.name = reverseData.results[0].name;
                        place.country = reverseData.results[0].country || "";
                    }
                } catch (reverseError) {
                    // Weather can still load if the city name is unavailable.
                    console.warn("Could not identify the nearby city.");
                }

                await getWeatherData(place);
                showMessage("Weather for your current location is ready.");
            } catch (error) {
                showMessage(error.message || "Unable to load local weather.");
            } finally {
                setLoading(false);
            }
        },
        function (error) {
            const errors = {
                1: "Location permission denied. Allow location access or search for a city.",
                2: "Your location could not be determined. Try again or search for a city.",
                3: "Location request timed out. Please try again."
            };

            showMessage(errors[error.code] || "Unable to access your location.");
            setLoading(false);
        },
        {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000
        }
    );
});