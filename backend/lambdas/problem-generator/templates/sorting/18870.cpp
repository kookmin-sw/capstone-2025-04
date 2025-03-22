// BOJ - 18870 좌표 압축

#include <iostream>
#include <algorithm>
#include <vector>

using namespace std;

vector<int> v, vv;

int main()
{
    int n; cin >> n;
    for(int i = 0; i < n; i++)
    {
        int _; cin >> _;
        v.push_back(_); vv.push_back(_);
    }

    sort(vv.begin(), vv.end());
    vv.erase(unique(vv.begin(), vv.end()), vv.end());
    for(int i : v)
        cout << (lower_bound(vv.begin(), vv.end(), i) - vv.begin()) << ' ';
}