
import { useState, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

// Weather information
function getWeatherInfo(code) {
  if (code === 0) return { text: "Clear sky", icon: "☀️" };
  if (code === 1) return { text: "Mainly clear", icon: "🌤️" };
  if (code === 2) return { text: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { text: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { text: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { text: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { text: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { text: "Rain showers", icon: "🌦️" };
  if (code === 85 || code === 86) return { text: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { text: "Thunderstorm", icon: "⛈️" };

  return { text: "Unknown conditions", icon: "🌡️" };
}

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [message, setMessage] = useState("");

  const [users, setUsers] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  // Get the user's profile from Supabase
  async function getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile error:", error.message);
      return null;
    }

    return data;
  }

  // Restore login when the app is refreshed
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error(error.message);
      }

      if (data.session) {
        const profile = await getProfile(data.session.user.id);

        if (mounted && profile) {
          setLoggedInUser(profile);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    }

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setLoggedInUser(null);
      }

      if (event === "SIGNED_IN" && session) {
        // Login handler loads the profile after authentication.
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Signup using Supabase Auth
  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setAuthMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setAuthMessage("Password must contain at least 6 characters.");
      return;
    }

    setAuthMessage("Creating your account...");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    if (data.session && data.user) {
      const profile = await getProfile(data.user.id);

      if (profile) {
        setLoggedInUser(profile);
        setAuthMessage("");
      } else {
        setAuthMessage(
          "Account created. Please log in after your profile is ready."
        );
      }
    } else {
      setAuthMessage(
        "Account created! Please verify your email if requested, then login."
      );
      setIsSignup(false);
    }

    setName("");
    setPassword("");
  }

  // Login using Supabase Auth
  async function handleLogin() {
    if (!email.trim() || !password) {
      setAuthMessage("Please enter email and password.");
      return;
    }

    setAuthMessage("Logging in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    const profile = await getProfile(data.user.id);

    if (!profile) {
      setAuthMessage("Unable to load your profile. Please try again.");
      await supabase.auth.signOut();
      return;
    }

    setCity("");
    setWeather(null);
    setMessage("");

    setLoggedInUser(profile);
    setAuthMessage("");

    // Record successful login
    const { error: historyError } = await supabase
      .from("login_history")
      .insert([
        {
          user_id: data.user.id,
        },
      ]);

    if (historyError) {
      console.error("Login history error:", historyError.message);
    }
  }

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setLoggedInUser(null);
    setEmail("");
    setPassword("");
    setCity("");
    setWeather(null);
    setMessage("");
    setAuthMessage("");
    setUsers([]);
    setSearchHistory([]);
    setLoginHistory([]);
  }

  // Fetch admin dashboard information
  useEffect(() => {
    if (!loggedInUser || loggedInUser.role !== "admin") {
      return;
    }

    async function loadAdminData() {
      const [usersResult, searchesResult, loginsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("weather_searches")
            .select("*")
            .order("searched_at", { ascending: false }),

          supabase
            .from("login_history")
            .select("*")
            .order("login_time", { ascending: false }),
        ]);

      if (usersResult.error) {
        console.error("Users error:", usersResult.error.message);
      } else {
        setUsers(usersResult.data || []);
      }

      if (searchesResult.error) {
        console.error("Search history error:", searchesResult.error.message);
      } else {
        setSearchHistory(searchesResult.data || []);
      }

      if (loginsResult.error) {
        console.error("Login history error:", loginsResult.error.message);
      } else {
        setLoginHistory(loginsResult.data || []);
      }
    }

    loadAdminData();
  }, [loggedInUser]);

  // Search weather
  async function searchWeather() {
    if (!city.trim()) {
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
        forecast: weatherData.daily,
      });

      setMessage("");

      // Save weather search in Supabase
      const { error } = await supabase
        .from("weather_searches")
        .insert([
          {
            user_id: loggedInUser.id,
            city: cityName,
          },
        ]);

      if (error) {
        console.error("Weather history error:", error.message);
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load weather. Check your internet connection.");
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div className="app">
        <h2>Loading SkyCast...</h2>
      </div>
    );
  }

  // Login and signup screen
  if (!loggedInUser) {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1> SkyCast</h1>
            <p>Your simple weather dashboard</p>
          </div>
        </header>

        <div className="auth-card">
          <h2>{isSignup ? "Create Account" : "Welcome Back"}</h2>

          <p>
            {isSignup
              ? "Sign up to explore weather around the world."
              : "Login to explore weather conditions for any city"}
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
        </div>
      </div>
    );
  }

  // Admin dashboard
  if (loggedInUser.role === "admin") {
    const registeredUsers = users.filter(
      (user) => user.role === "user"
    );

    return (
      <div className="app">
        <header className="header">
          <div>
            <h1> SkyCast Admin</h1>
            <p>Admin Dashboard</p>
          </div>

          <button onClick={handleLogout}>Logout</button>
        </header>

        <div className="weather-card">
          <h2>Welcome, {loggedInUser.name || "Admin"}</h2>

          <h3>User Management</h3>
          <p>Total registered users: {registeredUsers.length}</p>

          <h3>Registered Users</h3>

          {registeredUsers.length === 0 ? (
            <p>No users have registered yet.</p>
          ) : (
            registeredUsers.map((user) => (
              <p key={user.id}>
                {user.name || "Unnamed user"} — {user.email}
              </p>
            ))
          )}

          <hr />

          <h3>Weather Search History</h3>

          {searchHistory.length === 0 ? (
            <p>No weather searches recorded yet.</p>
          ) : (
            searchHistory.map((item) => (
              <p key={item.id}>
                {item.city} —{" "}
                {new Date(item.searched_at).toLocaleString()}
              </p>
            ))
          )}

          <hr />

          <h3>Login History</h3>

          {loginHistory.length === 0 ? (
            <p>No login records yet.</p>
          ) : (
            loginHistory.map((item) => {
              const user = users.find(
                (u) => u.id === item.user_id
              );

              return (
                <p key={item.id}>
                  {user?.email || item.user_id} —{" "}
                  {new Date(item.login_time).toLocaleString()}
                </p>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Regular user dashboard
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1> SkyCast</h1>
          <p>Welcome, {loggedInUser.name || loggedInUser.email}!</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      <div className="search">
        <input
          type="text"
          placeholder="Search for a place or city"
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
