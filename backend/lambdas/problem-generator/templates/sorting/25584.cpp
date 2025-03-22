// BOJ - 25584 근무 지옥에 빠진 푸앙이 (Large) ( EC#3 - Problem 07 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int tz[4] = {4, 6, 4, 10}; map<string, int> m; set<string> workers;
    int n; cin >> n;
    loop(i, 1, n) {
        loop(time, 0, 3) {
            loop(j, 1, 7) {
                string ss; cin >> ss;
                if(ss == "-") continue;
                m[ss] += tz[time]; workers.insert(ss);
            }
        }
    }
    
    // 완전 탐색: Large Problem에서는 TLE
    // 그러므로, workers 를 sort하여 max - min > 12 인지 확인해주면 된다.
    vector<int> workers_t;
    for(string wkr : workers) workers_t.push_back(m[wkr]);
    sort(workers_t.begin(), workers_t.end());

    if(workers_t.size()) cout << (workers_t.back() - workers_t.front() > 12 ? "No" : "Yes") << '\n';
    else cout << "Yes\n";
}