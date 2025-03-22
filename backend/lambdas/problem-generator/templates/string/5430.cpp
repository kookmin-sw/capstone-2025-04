// BOJ - 5430 AC

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXLEN 700000 + 1

using namespace std;

int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    int T; cin >> T;
    while(T--)
    {
        string p; cin >> p;
        int n; cin >> n;

        deque<int> arr;
        string tmp_arr; cin >> tmp_arr;
        char cstr[MAXLEN]; strcpy(cstr, tmp_arr.c_str());
        char* tmp = strtok(cstr, "[,]");
        while(tmp != NULL)
            arr.push_back(stoi(tmp)), tmp = strtok(NULL, "[,]");

        int error = 0, order = 1;
        LOOP(i, 0, p.size())
        {
            if(p[i] == 'R')
                order = !order;
            else
            {
                if(arr.empty())
                {
                    cout << "error" << '\n';
                    error = 1;
                    break;
                }

                if(order) arr.pop_front();
                else arr.pop_back();
            }
        }

        if(!error)
        {
            cout << '[';
            while(!arr.empty())
            {
                if(order)
                {
                    cout << arr.front();
                    arr.pop_front();
                }
                else
                {
                    cout << arr.back();
                    arr.pop_back();
                }

                if(!arr.empty())
                    cout << ',';
            }
            cout << "]\n";
        }
    }
}