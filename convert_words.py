import json

def convert():
    try:
        with open("words.txt", "r") as f:
            words = [line.strip().upper() for line in f if len(line.strip()) == 4]
        
        js_content = f"const WORDS = {json.dumps(words)};"
        
        with open("words.js", "w") as f:
            f.write(js_content)
        print(f"Successfully converted {len(words)} words to words.js")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    convert()
