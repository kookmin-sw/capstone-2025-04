// BOJ - 5800 성적 통계학

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int t; cin >> t;
    loop(p, 1, t) {
        vector<int> arr;
        int n, minv = 0x7f, maxv = -0x7f; cin >> n;
        loop(i, 1, n) {
            int k; cin >> k; arr.push_back(k);
            minv = min(minv, k);
            maxv = max(maxv, k);
        }
        sort(arr.begin(), arr.end());

        int maxgap = 0;
        LOOP(i, 0, n - 1) {
            maxgap = max(maxgap, arr[i + 1] - arr[i]);
        }
        cout << "Class " << p << '\n';
        cout << "Max " << maxv << ", Min " << minv << ", Largest gap " << maxgap << '\n';
    }
}