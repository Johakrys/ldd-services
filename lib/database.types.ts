export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      checklist_items: {
        Row: {
          checklist_id: string
          completed_at: string | null
          completed_by: string | null
          description: string
          id: string
          is_completed: boolean
          sort_order: number
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          completed_by?: string | null
          description: string
          id?: string
          is_completed?: boolean
          sort_order?: number
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          completed_by?: string | null
          description?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string
          id: string
          project_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_address: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_rates: {
        Row: {
          employee_id: string
          hourly_rate: number | null
          updated_at: string
        }
        Insert: {
          employee_id: string
          hourly_rate?: number | null
          updated_at?: string
        }
        Update: {
          employee_id?: string
          hourly_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_rates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_rates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          last_name: string | null
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          assigned_at: string
          employee_id: string
          job_id: string
          role: string | null
        }
        Insert: {
          assigned_at?: string
          employee_id: string
          job_id: string
          role?: string | null
        }
        Update: {
          assigned_at?: string
          employee_id?: string
          job_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_todays_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          project_id: string
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          project_id: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          project_id?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          stock_qty: number | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          stock_qty?: number | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          stock_qty?: number | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          related_id: string | null
          related_table: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_date: string | null
          project_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_date?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_date?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string | null
          latitude: number | null
          longitude: number | null
          project_id: string
          storage_path: string
          taken_at: string | null
          type: Database["public"]["Enums"]["photo_type"]
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          project_id: string
          storage_path: string
          taken_at?: string | null
          type?: Database["public"]["Enums"]["photo_type"]
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          project_id?: string
          storage_path?: string
          taken_at?: string | null
          type?: Database["public"]["Enums"]["photo_type"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_todays_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      plants: {
        Row: {
          category: string | null
          common_name: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          scientific_name: string | null
          sun_exposure: string | null
          unit_cost: number | null
          updated_at: string
          water_needs: string | null
        }
        Insert: {
          category?: string | null
          common_name: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          scientific_name?: string | null
          sun_exposure?: string | null
          unit_cost?: number | null
          updated_at?: string
          water_needs?: string | null
        }
        Update: {
          category?: string | null
          common_name?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          scientific_name?: string | null
          sun_exposure?: string | null
          unit_cost?: number | null
          updated_at?: string
          water_needs?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_materials: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          project_id: string
          quantity: number
          unit_cost_snapshot: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          project_id: string
          quantity?: number
          unit_cost_snapshot?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          project_id?: string
          quantity?: number
          unit_cost_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_plants: {
        Row: {
          created_at: string
          id: string
          location_notes: string | null
          plant_id: string
          planted_date: string | null
          project_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          location_notes?: string | null
          plant_id: string
          planted_date?: string | null
          project_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          location_notes?: string | null
          plant_id?: string
          planted_date?: string | null
          project_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_plants_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          budgeted_hours: number | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          estimated_cost: number | null
          id: string
          manager_id: string | null
          name: string
          priority: Database["public"]["Enums"]["priority_level"]
          property_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          budgeted_hours?: number | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          manager_id?: string | null
          name: string
          priority?: Database["public"]["Enums"]["priority_level"]
          property_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          budgeted_hours?: number | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          manager_id?: string | null
          name?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          property_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          access_notes: string | null
          address: string
          city: string | null
          client_id: string
          created_at: string
          id: string
          label: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          size_sqft: number | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          access_notes?: string | null
          address: string
          city?: string | null
          client_id: string
          created_at?: string
          id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          size_sqft?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          access_notes?: string | null
          address?: string
          city?: string | null
          client_id?: string
          created_at?: string
          id?: string
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          size_sqft?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          employee_id: string
          hours: number | null
          id: string
          is_approved: boolean
          is_paid: boolean
          job_id: string | null
          notes: string | null
          paid_at: string | null
          project_id: string | null
        }
        Insert: {
          clock_in: string
          clock_out?: string | null
          created_at?: string
          employee_id: string
          hours?: number | null
          id?: string
          is_approved?: boolean
          is_paid?: boolean
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          hours?: number | null
          id?: string
          is_approved?: boolean
          is_paid?: boolean
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_todays_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Views: {
      v_employee_hours: {
        Row: {
          amount_due: number | null
          amount_pending: number | null
          employee_id: string | null
          full_name: string | null
          hourly_rate: number | null
          is_active: boolean | null
          position: string | null
          total_hours: number | null
          unpaid_hours: number | null
        }
        Relationships: []
      }
      v_employee_payments: {
        Row: {
          amount: number | null
          employee_id: string | null
          hours: number | null
          paid_at: string | null
          pay_friday: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      v_employee_project_hours: {
        Row: {
          employee_id: string | null
          project_address: string | null
          project_city: string | null
          project_id: string | null
          project_name: string | null
          total_hours: number | null
          unpaid_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_employee_week_hours: {
        Row: {
          amount_pending: number | null
          employee_id: string | null
          pay_friday: string | null
          total_hours: number | null
          unpaid_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "v_employee_hours"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      v_monthly_revenue: {
        Row: {
          month: string | null
          payments_count: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_project_summary: {
        Row: {
          budgeted_hours: number | null
          checklist_done: number | null
          checklist_total: number | null
          client_name: string | null
          estimated_cost: number | null
          id: string | null
          name: string | null
          remaining_hours: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          total_hours: number | null
          total_paid: number | null
        }
        Relationships: []
      }
      v_project_team: {
        Row: {
          project_id: string | null
          team: string | null
        }
        Relationships: []
      }
      v_todays_jobs: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string | null
          description: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          project_id: string | null
          project_name: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_team"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      admin_reset_password: {
        Args: { p_password: string; p_user_id: string }
        Returns: undefined
      }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      can_manage_project: { Args: { pid: string }; Returns: boolean }
      can_view_project: { Args: { pid: string }; Returns: boolean }
      current_employee_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_assigned_to: { Args: { pid: string }; Returns: boolean }
      is_assigned_to_job: { Args: { jid: string }; Returns: boolean }
      is_manager_of: { Args: { pid: string }; Returns: boolean }
      update_my_email: { Args: { p_email: string }; Returns: undefined }
      verify_my_password: { Args: { p_password: string }; Returns: boolean }
    }
    Enums: {
      job_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      notification_type:
        | "job"
        | "payment"
        | "checklist"
        | "system"
        | "assignment"
      payment_method: "cash" | "check" | "card" | "transfer" | "other"
      payment_status: "pending" | "partial" | "paid" | "overdue" | "refunded"
      photo_type: "before" | "after" | "progress"
      priority_level: "low" | "medium" | "high" | "urgent"
      project_status:
        | "lead"
        | "quoted"
        | "approved"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
      user_role: "admin" | "manager" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      job_status: ["scheduled", "in_progress", "completed", "cancelled"],
      notification_type: [
        "job",
        "payment",
        "checklist",
        "system",
        "assignment",
      ],
      payment_method: ["cash", "check", "card", "transfer", "other"],
      payment_status: ["pending", "partial", "paid", "overdue", "refunded"],
      photo_type: ["before", "after", "progress"],
      priority_level: ["low", "medium", "high", "urgent"],
      project_status: [
        "lead",
        "quoted",
        "approved",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
      user_role: ["admin", "manager", "employee"],
    },
  },
} as const

