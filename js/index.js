// TODO: transfer to firebase functions
const API_KEY = "f3893cd33d19506354f252a28d96885c";

// decode response
const decodeResponse = async (response, city) => {
  switch (response.status) {
    case 200: {
      const data = await response.json();
      if (city) {
        data.city = city;
        localStorage.setItem("lastSearch", city);
      }
      return {
        status: "success",
        data
      }
    }
    case 401:
      return {
        status: "error",
        error: "Invalid API key specified"
      }
      
    case 404:
      return {
        status: "error",
        error: "Requested location was not found"
      }

    case 429:
      return {
        status: "error",
        error: "Too many requests. Try again later"
      }
  
    default:
      return {
        status: "error",
        error: "Invalid request"
      }
  }
}

// format our date to different formats for ease of use
const formatDate = (date) => {
  const fullDateOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const shortDateOptions = { day: "2-digit", month: "2-digit"};
  const monthOptions = { month: "2-digit"}
  const dayOfMonthOptions = { day: "2-digit"};
  const weekDayOptions = { weekday: "long" };
  const shortWeekDayOptions = { weekday: "short" };

  const msDate = new Date(date * 1000);

  return {
    full: msDate.toLocaleString([], fullDateOptions),
    short: msDate.toLocaleString([], shortDateOptions),
    concat: msDate.getFullYear().toString() + msDate.toLocaleString([], monthOptions) + msDate.toLocaleString([], dayOfMonthOptions),
    longDay: msDate.toLocaleString([], weekDayOptions),
    shortDay: msDate.toLocaleString([], shortWeekDayOptions),
    time: msDate.toLocaleTimeString(),
    unix: date
  }
}

// extract info we need from weather data
const extractWeatherInfo = (data) => {  

  // utility function to extract info from each weather data object
  const extractSingleInfo = (info) => {
    return {
      temp: info.temp,
      main: info.weather[0].main,
      description: info.weather[0].description,
      date: formatDate(info.dt)
    }    
  }

  const current = extractSingleInfo(data.current);
  const forecast = data.daily.map((info) => {
    return extractSingleInfo(info);
  });

  // return current data and forecast as objects
  return {
    current,
    forecast,
    city: data.city
  };
}

// get coordinates using city from current weather
const fetchCurrentWeather = async (location) => {
  try {
    //base url
    const baseUrl = "https://api.openweathermap.org/data/2.5/weather";

    // init common params
    const params = {
      appid: API_KEY,
      units: "metric",
    }

    if (typeof location === "string") {
      params.q = location;
    }
    else {
      params.lat = location.lat;
      params.lon = location.lon;
    }

    const url = new URL(baseUrl);  

    // append query params
    url.search = new URLSearchParams(params);

    const response = await fetch(url);

    return decodeResponse(response);  
    
  }
  catch (error) {
    return {
      status: "error",
      error: error.message
    }
  }

}

//fetch 7-day forecast
const fetchLiveForecast = async (location = 'New York', mode = "city") => {  
  try {
    //base url
    const baseUrl = "https://api.openweathermap.org/data/2.5/onecall";

    // init common params
    const params = {
      appid: API_KEY,
      units: "metric",
      exclude: "minutely,hourly"
    }

    // placeholder for city name
    let city;

    const url = new URL(baseUrl);

    if (mode === "coord") {
      params.lat = location.lat;
      params.lon = location.lon;

      const cityData = await fetchCurrentWeather(location);

      // if an error occured getting city rethrow the error
      if (cityData.error) {
        throw new Error(cityData.error);
      }

      //assign city name here
      city = cityData.data.name;
    }
    // if not coordinates then must be city
    else {
      city = location; // assign location to city var

      const cityData = await fetchCurrentWeather(location);

      // if an error occured getting city rethrow the error
      if (cityData.error) {
        throw new Error(cityData.error);
      }
      // get coordinates from weather
      params.lat = cityData.data.coord.lat;
      params.lon = cityData.data.coord.lon;
    }

    // append query params
    url.search = new URLSearchParams(params);

    const response = await fetch(url);    
    return decodeResponse(response, city);
  }
  catch (error) {
    return {
      status: "error",
      error: error.message
    }

  }
}

// promisify geolocation API callbacks
const getLocationPromise = () => {
  const options = {
    enableHighAccuracy: true,
    timeout: 10 * 1000,
    maximumAge: 0
  };

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      (positionError) => {
        reject(positionError);
      },
      options
    )
  });
}

//request location permission
const getLocationWithPermission = async () => {
  // when not supported
  if(!navigator.geolocation) {
    return {
      error: "unsupported"
    };
  } 

  // experimental :) PERMISSIONS API
  // check if permissions have already been granted
  if (navigator.permissions) {
    const permission = await navigator.permissions.query({
      name: "geolocation"
    });    

    // user has denied access don't bother
    if (permission.state === "denied") {
      return {
        error: "denied"
      };
    }

    // prompt user here
    else if (permission.state === "prompt") {
      //use our dialog to notify of upcoming request
      const allowLocation = confirm("We need permission to access your location for local weather");
      if(!allowLocation) {
        return {
          error: "denied"
        };
      }
    }
  }

  // request location
  try {
    const position = await getLocationPromise();
    return {
      lon: position.longitude,
      lat: position.latitude
    }

  } catch (error) {
    return {
      error: error.message
    };    
  }

}

// cache search result
const setCacheData = (data) => {
  const key = data.city.toLowerCase();  

  //stringify and store in localStorage with city as key
  localStorage.setItem(key, JSON.stringify(data));
}

// retrieve cached data
const getCacheData = (city) => {
  // convert to lowercase
  const key = city.toLowerCase();

  //get content in localStorage for given city
  const cachedData = localStorage.getItem(key);
  if (!cachedData) {
    return false;
  }

  // convert to object and return
  const cachedObject = JSON.parse(cachedData);
  return cachedObject;
}

// temp ul render
const createUl = (obj) => {
  const ulElem = document.createElement("ul");
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    const liElem = document.createElement("li");
    if (typeof obj[key] === "object") {
      liElem.textContent = key;
      liElem.appendChild(createUl(obj[key]));
    }
    else {
      liElem.textContent = obj[key];
    }
    ulElem.appendChild(liElem);
  }
  return ulElem;
}

// display current weather
const displayCurrentWeather = (data, city) => {
  // just show it for now
  const container = document.querySelector("#current-weather");
  const elem = createUl(data);

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const div = document.createElement("div");
  div.textContent = city;
  div.className = "current-city";

  container.appendChild(div);
  container.appendChild(elem);
}

// display forecast
const displayForecast = (records) => {
  // just show it for now
  const container = document.querySelector("#forecast-days");
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // create div and attach ul
  records.forEach((record) => {
    const div = document.createElement("div");
    div.className = "forecast-day";
    const elem = createUl(record);
    div.appendChild(elem);
    container.appendChild(div);
  });
  
}

// button click handlers
const btnSearch = document.querySelector("#btn-get-forecast");
const inputSearch = document.querySelector("#search-input");
const btnLocalSearch = document.querySelector("#btn-local-forecast");

btnSearch.addEventListener("click", async () => {
  if(!inputSearch.value) {
    return;
  }

  const searchCity = inputSearch.value;

  //check cache first before going online
  const cacheResult = getCacheData(searchCity);

  // if in cache then display it first
  if (cacheResult) {
    displayCurrentWeather(cacheResult.current, cacheResult.city);
    displayForecast(cacheResult.forecast);
  }

  // get live result online
  const result = await fetchLiveForecast(inputSearch.value);

  if (result.status === "success") {
    const data = extractWeatherInfo(result.data);
    
    // store result in cache
    setCacheData(data);

    displayCurrentWeather(data.current, data.city);
    displayForecast(data.forecast);
  }
  else if (result.status === "error") {
    console.log(result.error);
  }
});

btnLocalSearch.addEventListener("click", async () => {
  // get last local search from cache
  const lastLocalSearch = localStorage.getItem("lastLocalSearch");
  if (lastLocalSearch) {
    //check cache first before going online
    const cacheResult = getCacheData(lastLocalSearch);

    // if in cache then display it first
    if (cacheResult) {
      displayCurrentWeather(cacheResult.current, cacheResult.city);
      displayForecast(cacheResult.forecast);
    }

  }

  const coords = await getLocationWithPermission();
  const result = await fetchLiveForecast(coords, mode = "coord");

  if (result.status === "success") {
    const data = extractWeatherInfo(result.data);

    // store result in cache
    setCacheData(data);

    // store last home location
    localStorage.setItem("lastLocalSearch", data.city);


    displayCurrentWeather(data.current, data.city);
    displayForecast(data.forecast);
  }
  else if (result.status === "error") {
    console.log(result.error);
  }
});
