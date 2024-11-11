# Pod Board Images  

Pod Board Images is a simple web-based project that dynamically displays images based on the day of the week, time of day, or U.S. holidays. The displayed image updates automatically depending on the current date and time, ensuring that relevant content is shown throughout the day.  

## Features  
- **Day & Time-Based Images**: Display images based on specific days and times.  
- **Holiday-Specific Images**: U.S. holidays take precedence over regular weekday images.  
- **Error Image**: Displays a fallback image if no valid image is available.  
- **Dynamic Updates**: The image updates every minute without requiring a page refresh.  

---  

## Project Structure  

- **`index.html`**: Main webpage containing the JavaScript to fetch and display images.  
- **`images.json`**: JSON file where all images are defined for weekdays, holidays, and errors.  

---  

## How to Add Images to `images.json`  

The `images.json` file contains three main sections: `Weekdays`, `Holidays`, and `Error`. Below is a detailed guide on how to add and structure images.  

### 1. **Weekday Images**  
Weekday images are associated with specific times. The time format is **24-hour** (e.g., `1300` for 1:00 PM). The image corresponding to the latest past time for the current day will be displayed until the next time's image is scheduled.  

#### Example:  
```json  
"Monday": {  
  "0700": "https://example.com/monday-7am.webp",  
  "1300": "https://example.com/monday-1pm.webp"  
}  
```  
- `0700`: Image starts appearing from 7:00 AM.  
- `1300`: Image starts appearing from 1:00 PM.  

Repeat this structure for each weekday as needed.  

---  

### 2. **Holiday Images**  
Holiday images override weekday images if the current date matches a holiday in **MM-DD** format.  

#### Example:  
```json  
"holidays": {  
  "01-01": "https://example.com/new-year.webp",  
  "07-04": "https://example.com/independence-day.webp",  
  "12-25": "https://example.com/christmas-day.webp"  
}  
```  
- **01-01**: Displays the image for New Year’s Day.  
- **07-04**: Displays the image for Independence Day.  
- **12-25**: Displays the image for Christmas Day.  

You can add more holidays by following this format.  

---  

### 3. **Error Image**  
The error image is shown when:  
- No valid image is found for the current time.  
- There’s an issue in loading or fetching data.  

#### Example:  
```json  
"error": {  
  "imageUrl": "https://example.com/error-image.webp"  
}  
```  

---  

## How to Run the Project  

1. **Setup the Files**:  
   - Place `index.html` and `images.json` in the same directory.  

2. **Run Locally**:  
   - Open `index.html` in a web browser to view the dynamic image display.  

3. **Deploy Online**:  
   - Host both files on a web server to make the project accessible online.  

---  

## Notes  

- **Holidays Overwrite Weekdays**: If today is a holiday, the holiday image will be displayed regardless of weekday settings.  
- **Time Format**: Use **24-hour format** for weekday times (e.g., `1300` for 1:00 PM).  
- **Image Start Time**: The image associated with a specific time will start appearing from that time and remain until the next time-defined image.  
- **Error Image**: Ensures fallback content is displayed when no valid image is found.  

---  

## Example `images.json`  

```json  
{  
  "Monday": {  
    "0700": "https://example.com/monday-morning.webp",  
    "1200": "https://example.com/monday-noon.webp"  
  },  
  "holidays": {  
    "01-01": "https://example.com/new-year.webp",  
    "07-04": "https://example.com/independence-day.webp"  
  },  
  "error": {  
    "imageUrl": "https://example.com/error-image.webp"  
  }  
}  
```  