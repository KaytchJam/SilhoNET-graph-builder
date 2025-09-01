

/** Convert "image" File types into HTMLImageElement types */
function file_to_image(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader: FileReader = new FileReader();

    reader.onload = () => {
      if (reader.result) {
        const img: HTMLImageElement = new Image();
        img.src = reader.result as string;

        img.onload = () => resolve(img);
        img.onerror = (error) => reject(error);
      } else {
        reject(new Error("File could not be read."));
      }
    };

    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsDataURL(file);
  });
}

/** Takes in FormData corresponding to an File input, the name of the input corresponding to the form data 
 * you'd like to receive: `input_name`, and a generic function `setter` that takes in an HTMLImageElement
 * as an argument. Converts the File from input `input_name` into an HTMLImageElement and passes it into
 * the function F `setter`. */
export async function accept_file<F extends (arg: HTMLImageElement) => void>(f: FormData, input_name: string, setter: F): Promise<void> {
    const input_file: FormDataEntryValue | null = f.get(input_name);
    if (input_file) {
        const input_image: HTMLImageElement = await file_to_image(input_file as File);
        setter(input_image);
    }
}