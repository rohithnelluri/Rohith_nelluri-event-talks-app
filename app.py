import xml.etree.ElementTree as ET
import requests
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# URL of the BigQuery Release Notes RSS XML feed
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        # Atom Namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_elem = entry.find('atom:title', ns)
            title = title_elem.text if title_elem is not None else "Unknown Date"
            
            id_elem = entry.find('atom:id', ns)
            entry_id = id_elem.text if id_elem is not None else ""
            
            updated_elem = entry.find('atom:updated', ns)
            updated = updated_elem.text if updated_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content = content_elem.text if content_elem is not None else ""
            
            # Find alternate link
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry.find("atom:link", ns)
            link = link_elem.attrib.get('href', '') if link_elem is not None else ""
            
            entries.append({
                'id': entry_id,
                'title': title, # Typically the date string, e.g. "June 23, 2026"
                'updated': updated,
                'content': content,
                'link': link
            })
            
        return jsonify({
            'success': True,
            'entries': entries
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': f"Failed to fetch release notes: {str(e)}"
        }), 502
    except ET.ParseError as e:
        return jsonify({
            'success': False,
            'error': f"Failed to parse release notes XML: {str(e)}"
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
