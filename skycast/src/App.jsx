import { useState } from "react";
import "./App.css";

// Demo Admin account:
// Email: admin@skycast.com
// Password: admin123

function getWeatherInfo(code) {
  if (code === 0) {
    return { text: "Clear sky", icon: "☀️" };
  }

  if (code === 1) {
    return { text: "Mainly clear", icon: "🌤️" };
  }

  if (code === 2) {
    return { text: "Partly cloudy", icon: "⛅" };
  }

  if (code === 3) {
    return { text: "Overcast", icon: "☁️" };
  }

  if (code === 45 || code === 48) {
    return { text: "Foggy", icon: "🌫️" };
  }

  if (code >= 51 && code <= 57) {
    return { text: "Drizzle", icon: "🌦️" };
  }

  if (code >= 61 && code <= 67) {
    return { text: "Rain", icon: "🌧️" };
  }

  if (code >= 71 && code <= 77) {
    return { text: "Snow", icon: "❄️" };
  }

  if (code >= 80 && code <= 82) {
    return { text: "Rain showers", icon: "🌦️" };
  }

  if (code === 85 || code === 86) {
    return { text: "Snow showers", icon: "🌨️" };
  }

  if (code >= 95) {
    return { text: "Thunderstorm", icon: "⛈️" };
  }

  return { text: "Unknown conditions", icon: "🌡️" };
}

function App() {
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem("skycastUsers");

    if (savedUsers) {
      return JSON.parse(savedUsers);
    }

    const defaultUsers = [
      {
        name: "Admin",
        email: "admin@skycast.com",
        password: "admin123",
        role: "admin"
      }
    ];

    localStorage.setItem("skycastUsers", JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [message, setMessage] = useState("");

  function handleSignup() {
    if (
      name.trim() === "" ||
      email.trim() === "" ||
      password.trim() === ""
    ) {
      setAuthMessage("Please fill in all fields.");
      return;
    }

    const existingUser = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      setAuthMessage("This email is already registered.");
      return;
    }

    const newUser = {
      name: name.trim(),
      email: email.trim(),
      password: password,
      role: "user"
    };

    const updatedUsers = [...users, newUser];

    setUsers(updatedUsers);
    localStorage.setItem("skycastUsers", JSON.stringify(updatedUsers));

    setAuthMessage("Signup successful! Please login.");
    setIsSignup(false);
    setName("");
    setEmail("");
    setPassword("");
  }

  function handleLogin() {
    const foundUser = users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.password === password
    );

    if (foundUser) {
      setLoggedInUser(foundUser);
      setAuthMessage("");
    } else {
      setAuthMessage("Invalid email or password.");
    }
  }

  function handleLogout() {
    setLoggedInUser(null);
    setEmail("");
    setPassword("");
    setWeather(null);
    setMessage("");
  }

  async function searchWeather() {
    if (city.trim() === "") {
      setMessage("Please enter a city name.");
      return;
    }

    try {
      setMessage("Loading weather...");
      setWeather(null);

      const locationResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city
        )}&count=1`
      );

      const locationData = await locationResponse.json();

      if (!locationData.results || locationData.results.length === 0) {
        setMessage("City not found. Please try another city.");
        return;
      }

      const latitude = locationData.results[0].latitude;
      const longitude = locationData.results[0].longitude;
      const cityName = locationData.results[0].name;

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`
      );

      const weatherData = await weatherResponse.json();

      setWeather({
        cityName: cityName,
        temperature: weatherData.current.temperature_2m,
        humidity: weatherData.current.relative_humidity_2m,
        wind: weatherData.current.wind_speed_10m,
        weatherCode: weatherData.current.weather_code,
        forecast: weatherData.daily
      });

      setMessage("");
    } catch (error) {
      setMessage("Unable to load weather. Check your internet connection.");
    }
  }

  // Login and Signup screen
  if (!loggedInUser) {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1>☁️ SkyCast</h1>
            <p>Your simple weather dashboard</p>
          </div>
        </header>

        <div className="auth-card">
          <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>

          <p>
            {isSignup
              ? "Sign up to explore weather around the world."
              : "Login to check your local weather."}
          </p>

          {isSignup && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={isSignup ? handleSignup : handleLogin}>
            {isSignup ? "Create Account" : "Login"}
          </button>

          <p>{authMessage}</p>

          <p>
            {isSignup ? "Already have an account?" : "New to SkyCast?"}

            <button
              className="text-button"
              onClick={() => {
                setIsSignup(!isSignup);
                setAuthMessage("");
              }}
            >
              {isSignup ? " Login" : " Sign Up"}
            </button>
          </p>

          <p className="demo-login">
            Demo Admin: admin@skycast.com / admin123
          </p>
        </div>
      </div>
    );
  }

  // Admin module
  if (loggedInUser.role === "admin") {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1>☁️ SkyCast Admin</h1>
            <p>Admin Dashboard</p>
          </div>

          <button onClick={handleLogout}>Logout</button>
        </header>

        <div className="weather-card">
          <h2>Welcome, {loggedInUser.name}</h2>

          <h3>User Management</h3>

          <p>Total registered users: {users.length - 1}</p>

          <h3>Registered Users</h3>

          {users.filter((user) => user.role === "user").length === 0 ? (
            <p>No users have registered yet.</p>
          ) : (
            users
              .filter((user) => user.role === "user")
              .map((user) => (
                <p key={user.email}>
                  {user.name} — {user.email}
                </p>
              ))
          )}
        </div>
      </div>
    );
  }

  // User module
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>☁️ SkyCast</h1>
          <p>Welcome, {loggedInUser.name}!</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      <div className="search">
        <input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchWeather();
            }
          }}
        />

        <button onClick={searchWeather}>Search</button>
      </div>

      <p>{message}</p>

      {weather && (
        <>
          <div className="weather-card">
            <h2>{weather.cityName}</h2>

            <h1>
              {getWeatherInfo(weather.weatherCode).icon}{" "}
              {weather.temperature}°C
            </h1>

            <p>{getWeatherInfo(weather.weatherCode).text}</p>

            <p>💧 Humidity: {weather.humidity}%</p>
            <p>💨 Wind Speed: {weather.wind} km/h</p>
          </div>

          <div className="forecast">
            <h2>5-Day Forecast</h2>

            <div className="forecast-list">
              {weather.forecast.time.map((date, index) => {
                const forecastInfo = getWeatherInfo(
                  weather.forecast.weather_code[index]
                );

                return (
                  <div className="forecast-card" key={date}>
                    <h3>
                      {new Date(date + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        { weekday: "short" }
                      )}
                    </h3>

                    <p>{forecastInfo.icon}</p>
                    <p>{forecastInfo.text}</p>

                    <p>
                      {weather.forecast.temperature_2m_max[index]}°C /
                      {weather.forecast.temperature_2m_min[index]}°C
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;