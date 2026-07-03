<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance\AttendanceVenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VenueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->integer('per_page', 15);
        $query = AttendanceVenue::query();

        $includes = $this->parseIncludes($request, ['terminals']);
        $query->with($includes);

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('venue_type')) {
            $query->where('venue_type', $request->venue_type);
        }

        $query->withCount('terminals');

        $venues = $query->paginate($perPage);

        return response()->json([
            'data' => $venues->items(),
            'meta' => [
                'current_page' => $venues->currentPage(),
                'last_page' => $venues->lastPage(),
                'per_page' => $venues->perPage(),
                'total' => $venues->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:attendance_venues,code',
            'venue_type' => 'required|string|max:50',
            'capacity' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
            'faculty_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
            'lecture_venue_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $venue = AttendanceVenue::create($validator->validated());
            $venue->loadCount('terminals');

            return response()->json(['data' => $venue, 'message' => 'Venue created successfully.'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create venue.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $includes = $this->parseIncludes($request, ['terminals']);

        $venue = AttendanceVenue::with($includes)->withCount('terminals')->find($id);

        if (!$venue) {
            return response()->json(['message' => 'Venue not found.'], 404);
        }

        return response()->json(['data' => $venue]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $venue = AttendanceVenue::find($id);

        if (!$venue) {
            return response()->json(['message' => 'Venue not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50|unique:attendance_venues,code,' . $id,
            'venue_type' => 'sometimes|required|string|max:50',
            'capacity' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
            'faculty_id' => 'nullable|integer',
            'department_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $venue->update($validator->validated());
            $venue->loadCount('terminals');

            return response()->json(['data' => $venue, 'message' => 'Venue updated successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update venue.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $venue = AttendanceVenue::find($id);

        if (!$venue) {
            return response()->json(['message' => 'Venue not found.'], 404);
        }

        try {
            $venue->delete();

            return response()->json(['message' => 'Venue deleted successfully.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete venue.', 'error' => $e->getMessage()], 500);
        }
    }

    private function parseIncludes(Request $request, array $allowed): array
    {
        if (!$request->filled('include')) {
            return [];
        }

        $includes = explode(',', $request->include);

        return array_intersect($includes, $allowed);
    }
}
