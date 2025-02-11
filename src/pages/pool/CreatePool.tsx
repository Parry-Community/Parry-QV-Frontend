/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { useFormik } from "formik";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import { CreatePoolValues } from "../../interface";
import { createPollOnChain, getFactoryProjects } from "../../utils/integration";
import ErrorModal from "../../components/ErrorModal";

const CreatePool = () => {
  const [dragActive, setDragActive] = useState<boolean>(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [projectData, setProjectData] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const fetchProjectData = async () => {
    try {
      const projects = await getFactoryProjects();

      if (Array.isArray(projects)) {
        setProjectData(projects);
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
      setError("Something went wrong.");
    }
  };

  const handleUploadImageToIPFS = async (image: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", image);
      formData.append(
        "pinataMetadata",
        JSON.stringify({
          name: "Image",
          keyvalues: { description: "Image generated" },
        })
      );

      const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

      const response = await axios.post(url, formData, {
        maxBodyLength: Infinity,
        headers: {
          pinata_api_key: "a507741735fbd024ad7d",
          pinata_secret_api_key:
            "be8b3f3e9c96e0290e46e1175e3acb8ff449166f4be464166b5e06fc94ebfed9",
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200 && response.data.IpfsHash) {
        return response.data.IpfsHash;
      } else {
        setError("Failed to upload image to IPFS");
      }
    } catch (error) {
      console.error("Error uploading to Pinata:", error);
      setError("Something went wrong.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik<CreatePoolValues>({
    initialValues: {
      name: "",
      description: "",
      projectId: "",
      image: null,
    },

    validationSchema: Yup.object({
      name: Yup.string().required("Pool Title is required"),
      description: Yup.string().required("Description is required"),
      projectId: Yup.string().required("Project ID is required"),
      image: Yup.mixed<File>()
        .required("Image is required")
        .test(
          "fileFormat",
          "Unsupported Format. Only PNG, JPG, or WEBP allowed.",
          (value) =>
            value &&
            ["image/png", "image/jpg", "image/jpeg", "image/webp"].includes(
              value.type
            )
        ),
    }),

    onSubmit: async (values) => {
      setLoading(true);
      setError(null);

      try {
        const ipfsHash = await handleUploadImageToIPFS(values.image!);
        if (!ipfsHash) {
          setError("IPFS upload failed");
          return;
        }
        const payload: CreatePoolValues = {
          name: values.name,
          description: values.description,
          projectId: values.projectId,
          ipfsHash,
        };

        const txResult: any = await createPollOnChain(payload);

        if (txResult?.status) {
          setModalOpen(true);
        } else {
          if (txResult?.error?.code === "ACTION_REJECTED") {
            setError("User rejected the transaction.");
          } else {
            setError(`Transaction failed: ${txResult?.error?.reason}`);
          }
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
  });

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      setFieldValue("image", file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files?.[0]) {
      const file = event.currentTarget.files[0];
      setFieldValue("image", file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const {
    handleSubmit,
    values,
    setFieldValue,
    handleChange,
    handleBlur,
    touched,
    errors,
    resetForm,
  } = formik;

  useEffect(() => {
    fetchProjectData();
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#0E101A] mb-4">
          Create a New Pool
        </h1>

        <p className="text-gray-600">
          Set up a new voting pool for your community
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 space-y-6"
      >
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Pool Title
          </label>

          <input
            id="name"
            type="text"
            name="name"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.name}
            className={`w-full px-4 py-3 rounded-lg border ${
              touched.name && errors.name ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-[#FE0421] focus:border-transparent`}
            placeholder="Enter pool title"
          />

          {touched.name && errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="projectId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description
          </label>

          <textarea
            name="description"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.description}
            rows={4}
            className={`w-full px-4 py-3 rounded-lg border ${
              touched.description && errors.description
                ? "border-red-500"
                : "border-gray-300"
            } focus:ring-2 focus:ring-[#FE0421] focus:border-transparent`}
            placeholder="Describe your pool"
          />

          {touched.description && errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="projectId"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Project ID
          </label>

          <select
            name="projectId"
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.projectId}
            className={`w-full px-4 py-3 rounded-lg border ${
              touched.projectId && errors.projectId
                ? "border-red-500"
                : "border-gray-300"
            } focus:ring-2 focus:ring-[#FE0421] focus:border-transparent`}
          >
            <option value="">Select Project ID</option>
            {projectData.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>

          {touched.projectId && errors.projectId && (
            <p className="text-red-500 text-sm mt-1">{errors.projectId}</p>
          )}
        </div>

        <div
          className={`flex items-center justify-center w-full ${
            dragActive ? "bg-gray-100" : ""
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-[#FAFDFE] hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-40 object-contain"
                  loading="lazy"
                />
              ) : (
                <>
                  <ImagePlus className="w-12 h-12 text-[#FE0421] mb-4" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, or WEBP (MAX. 800x400px)
                  </p>
                </>
              )}
            </div>

            <input
              type="file"
              name="image"
              accept="image/png, image/jpg, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {touched.image && errors.image && (
          <p className="text-red-500 text-sm mt-1">{errors.image}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FE0421] text-white py-4 px-6 rounded-lg font-semibold hover:bg-red-600 transition-colors"
        >
          {loading ? "Creating..." : "Create Pool"}
        </button>

        {error && (
          <ErrorModal errorMessage={error} onClose={() => setError(null)} />
        )}
      </form>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <p className="text-gray-600 mb-4">Pool created successfully!</p>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                  setImagePreview(null);
                }}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <ErrorModal errorMessage={error} onClose={() => setError(null)} />
      )}
    </div>
  );
};

export default CreatePool;
